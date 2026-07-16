import type Graph3dPlugin from "@/main";
import type { TFile } from "obsidian";
import { normalizePath } from "obsidian";
import { debounce } from "@/util/debounce";
import { generateUUID } from "@/util/generateUUID";

export type NodePositions = Record<string, { x: number; y: number; z: number }>;

export type SavedLayout = {
  id: string;
  title: string;
  positions: NodePositions;
};

type PositionsData = {
  current: NodePositions;
  layouts: SavedLayout[];
  quicksaveLayoutId?: string | null;
  frontmatterTouched?: string[];
};

export class NodePositionManager {
  private plugin: Graph3dPlugin;
  private filePath: string;
  private current: NodePositions = {};
  private layouts: SavedLayout[] = [];
  private quicksaveLayoutId: string | null = null;
  private frontmatterTouched: Set<string> = new Set();

  public readonly saveDebounced: () => void;

  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
    this.filePath = normalizePath(`${plugin.manifest.dir}/positions.json`);
    this.saveDebounced = debounce(this.save.bind(this), 500);
  }

  async load(): Promise<void> {
    try {
      const raw = await this.plugin.app.vault.adapter.read(this.filePath);
      const data = JSON.parse(raw) as Partial<PositionsData>;
      // handle old format (flat NodePositions) or new format
      if (data.current !== undefined) {
        this.current = data.current;
        this.layouts = data.layouts ?? [];
        this.quicksaveLayoutId = data.quicksaveLayoutId ?? null;
        this.frontmatterTouched = new Set(data.frontmatterTouched ?? []);
      } else {
        // legacy: whole file was NodePositions
        this.current = data as NodePositions;
        this.layouts = [];
      }
    } catch {
      this.current = {};
      this.layouts = [];
    }
  }

  async save(): Promise<void> {
    const data: PositionsData = {
      current: this.current,
      layouts: this.layouts,
      quicksaveLayoutId: this.quicksaveLayoutId,
      frontmatterTouched: [...this.frontmatterTouched],
    };
    await this.plugin.app.vault.adapter.write(this.filePath, JSON.stringify(data, null, 2));
  }

  // --- current positions (auto-saved on drag) ---

  setPosition(path: string, x: number, y: number, z: number): void {
    this.current[path] = { x, y, z };
  }

  async writeFrontmatter(path: string, x: number, y: number, z: number): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
    if (!file || !path.endsWith(".md")) return;
    this.plugin.beginFrontmatterWrite();
    try {
      await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
        fm.graph_pos = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
      });
      this.frontmatterTouched.add(path);
      this.plugin.markRecentlySaved(path);
    } finally {
      this.plugin.endFrontmatterWrite();
    }
  }

  async clearFrontmatterFromTouched(): Promise<void> {
    this.plugin.beginFrontmatterWrite();
    try {
      for (const path of this.frontmatterTouched) {
        const file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
        if (!file) continue;
        await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
          delete fm.graph_pos;
        });
        this.plugin.markRecentlySaved(path);
      }
      this.frontmatterTouched.clear();
      await this.save();
    } finally {
      this.plugin.endFrontmatterWrite();
    }
  }

  // Bulk-write for the "Save coordinates to frontmatter" toggle - fires once per
  // off-to-on flip, over whatever the caller says is currently visible (respects
  // live filters at the moment of the call, not a fixed historical set). One
  // begin/end wrapping the whole batch, same pattern as clearFrontmatterFromTouched,
  // and fired concurrently (Promise.all) since each write touches a different file -
  // the counter-based write guard already supports overlap.
  async writeFrontmatterForNodes(
    nodes: { path: string; x: number; y: number; z: number }[]
  ): Promise<number> {
    this.plugin.beginFrontmatterWrite();
    let saved = 0;
    try {
      await Promise.all(
        nodes.map(async ({ path, x, y, z }) => {
          const file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
          if (!file || !path.endsWith(".md")) return;
          await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
            fm.graph_pos = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
          });
          this.frontmatterTouched.add(path);
          this.plugin.markRecentlySaved(path);
          saved++;
        })
      );
      await this.save();
    } finally {
      this.plugin.endFrontmatterWrite();
    }
    return saved;
  }

  // "Clear coordinates from frontmatter" (Utils button) - scoped to whatever the
  // caller says is currently visible, checked live against each note's actual
  // current frontmatter rather than the frontmatterTouched history. Deliberately
  // NOT the same as clearFrontmatterFromTouched: that one wipes everything ever
  // touched regardless of current filters, this one only removes graph_pos from
  // nodes that are both currently visible AND actually have it right now - so
  // switching filters between a save and a clear can't nuke something out of view.
  async clearFrontmatterForNodes(paths: string[]): Promise<number> {
    this.plugin.beginFrontmatterWrite();
    let cleared = 0;
    try {
      await Promise.all(
        paths.map(async (path) => {
          const file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
          if (!file || !path.endsWith(".md")) return;
          const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
          if (!fm?.graph_pos) return;
          await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
            delete fm.graph_pos;
          });
          this.frontmatterTouched.delete(path);
          this.plugin.markRecentlySaved(path);
          cleared++;
        })
      );
      await this.save();
    } finally {
      this.plugin.endFrontmatterWrite();
    }
    return cleared;
  }

  getAll(): NodePositions {
    return this.current;
  }

  // Frontmatter graph_pos is the source of truth (set on drag-end / explicit
  // saves); positions.json (`current`) is the fallback for anything not yet
  // written to frontmatter. Ring meshes and apply-ring-layouts previously read
  // `current` directly and defaulted to (0,0,0) or skipped entirely when a
  // ring had frontmatter but no positions.json entry — this is the one place
  // that decision gets made now.
  getEffectivePosition(path: string): { x: number; y: number; z: number } | undefined {
    const file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
    if (file) {
      const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm?.graph_pos && typeof fm.graph_pos === "string") {
        const parts = fm.graph_pos.split(",").map(Number);
        if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
          return { x: parts[0]!, y: parts[1]!, z: parts[2]! };
        }
      }
    }
    return this.current[path];
  }

  async clear(): Promise<void> {
    this.current = {};
    await this.save();
  }

  // A saved layout is a snapshot of every known node's *effective* position,
  // not raw positions.json - `current` alone goes stale for any node whose
  // frontmatter graph_pos was set/edited without a matching drag (e.g. moved
  // between rings, hand-edited, or left over from before a file was renamed),
  // and saving/applying that stale value silently regresses a node that
  // reset-rings/reload would otherwise place correctly from frontmatter.
  private snapshotEffectivePositions(): NodePositions {
    const paths = new Set([...Object.keys(this.current), ...this.frontmatterTouched]);
    const snapshot: NodePositions = {};
    for (const path of paths) {
      const pos = this.getEffectivePosition(path);
      if (pos) snapshot[path] = pos;
    }
    return snapshot;
  }

  // --- named layouts ---

  getLayouts(): SavedLayout[] {
    return this.layouts;
  }

  async saveLayout(title: string): Promise<SavedLayout> {
    const layout: SavedLayout = {
      id: generateUUID(),
      title,
      positions: this.snapshotEffectivePositions(),
    };
    this.layouts.push(layout);
    await this.save();
    return layout;
  }

  async updateLayout(id: string): Promise<void> {
    const layout = this.layouts.find((l) => l.id === id);
    if (layout) {
      layout.positions = this.snapshotEffectivePositions();
      await this.save();
    }
  }

  async renameLayout(id: string, title: string): Promise<void> {
    const layout = this.layouts.find((l) => l.id === id);
    if (layout) {
      layout.title = title;
      await this.save();
    }
  }

  async deleteLayout(id: string): Promise<void> {
    this.layouts = this.layouts.filter((l) => l.id !== id);
    await this.save();
  }

  applyLayoutToCurrent(id: string): NodePositions | null {
    const layout = this.layouts.find((l) => l.id === id);
    if (!layout) return null;
    this.current = { ...layout.positions };
    this.saveDebounced();
    return this.current;
  }

  // --- quicksave target ---

  getQuicksaveLayoutId(): string | null {
    return this.quicksaveLayoutId;
  }

  async setQuicksaveLayoutId(id: string | null): Promise<void> {
    this.quicksaveLayoutId = id;
    await this.save();
  }
}
