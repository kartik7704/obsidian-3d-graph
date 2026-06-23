import type Graph3dPlugin from "@/main";
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
};

export class NodePositionManager {
  private plugin: Graph3dPlugin;
  private filePath: string;
  private current: NodePositions = {};
  private layouts: SavedLayout[] = [];

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
    const data: PositionsData = { current: this.current, layouts: this.layouts };
    await this.plugin.app.vault.adapter.write(this.filePath, JSON.stringify(data, null, 2));
  }

  // --- current positions (auto-saved on drag) ---

  setPosition(path: string, x: number, y: number, z: number): void {
    this.current[path] = { x, y, z };
  }

  getAll(): NodePositions {
    return this.current;
  }

  async clear(): Promise<void> {
    this.current = {};
    await this.save();
  }

  // --- named layouts ---

  getLayouts(): SavedLayout[] {
    return this.layouts;
  }

  async saveLayout(title: string): Promise<SavedLayout> {
    const layout: SavedLayout = {
      id: generateUUID(),
      title,
      positions: { ...this.current },
    };
    this.layouts.push(layout);
    await this.save();
    return layout;
  }

  async updateLayout(id: string): Promise<void> {
    const layout = this.layouts.find((l) => l.id === id);
    if (layout) {
      layout.positions = { ...this.current };
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
}
