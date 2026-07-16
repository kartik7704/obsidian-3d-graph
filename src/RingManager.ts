import type Graph3dPlugin from "@/main";
import * as THREE from "three";
import type { TFile } from "obsidian";
import type { NodePositions } from "@/NodePositionManager";

export type RingSort = "name" | "created" | "modified" | "updated";

export type RingData = {
  path: string;
  radius: number;
  filter: string; // tag to match children (without #), e.g. "log"
  normal: THREE.Vector3;
  sort: RingSort;
  filterDays?: number; // only include children dated within the last N days
};

export class RingManager {
  private plugin: Graph3dPlugin;
  private rings: Map<string, RingData> = new Map();
  // ring path -> sorted child paths, rebuilt each load(). Same refresh
  // lifecycle as `rings` itself (only rescanned on an explicit load() call,
  // e.g. plugin start or "Reload rings") — previously getChildPaths rescanned
  // every markdown file in the vault on every call, including every single
  // frame of a ring drag.
  private childPathsCache: Map<string, string[]> = new Map();

  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
  }

  async load(): Promise<void> {
    this.rings.clear();
    this.childPathsCache.clear();

    // Single pass: collect ring definitions, bucket every file by its tags,
    // and record each file's created/modified metadata — all at the same
    // time, instead of a second full-vault scan per ring later.
    const filesByTag: Map<string, string[]> = new Map();
    const fileMeta: Map<string, { created?: string; updated?: string; mtime: number }> = new Map();

    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;

      fileMeta.set(file.path, {
        created: typeof fm?.created === "string" ? fm.created : undefined,
        updated: typeof fm?.updated === "string" ? fm.updated : undefined,
        mtime: file.stat.mtime,
      });

      if (!fm) continue;

      const tags: string[] = Array.isArray(fm.tags)
        ? (fm.tags as string[])
        : typeof fm.tags === "string"
        ? [fm.tags]
        : [];

      for (const tag of tags) {
        if (!filesByTag.has(tag)) filesByTag.set(tag, []);
        filesByTag.get(tag)!.push(file.path);
      }

      if (!tags.includes("ring")) continue;

      const radius: number = typeof fm.radius === "number" ? fm.radius : 150;
      const filter: string =
        typeof fm["ring-filter"] === "string" ? fm["ring-filter"].replace(/^#/, "") : "";
      const nArr: number[] = Array.isArray(fm["ring-normal"])
        ? (fm["ring-normal"] as number[])
        : [0, 1, 0];
      const normal = new THREE.Vector3(nArr[0] ?? 0, nArr[1] ?? 1, nArr[2] ?? 0).normalize();
      const sortRaw =
        typeof fm["ring-sort"] === "string" ? fm["ring-sort"].toLowerCase().trim() : "";
      const sort: RingSort =
        sortRaw === "created" || sortRaw === "modified" || sortRaw === "updated" ? sortRaw : "name";
      // Obsidian's Properties panel writes a "Text"-typed field as a quoted
      // string ("7") rather than a bare number, depending on how the
      // property's type got inferred on first entry — accept both instead
      // of silently no-op'ing on whichever one the user didn't type raw YAML for.
      const filterDaysRaw = fm["ring-filter-days"];
      const filterDaysNum =
        typeof filterDaysRaw === "number"
          ? filterDaysRaw
          : typeof filterDaysRaw === "string"
          ? Number(filterDaysRaw)
          : NaN;
      const filterDays = isFinite(filterDaysNum) && filterDaysNum > 0 ? filterDaysNum : undefined;

      this.rings.set(file.path, { path: file.path, radius, filter, normal, sort, filterDays });
    }

    for (const ring of this.rings.values()) {
      if (!ring.filter) {
        this.childPathsCache.set(ring.path, []);
        continue;
      }
      let children = (filesByTag.get(ring.filter) ?? []).filter((p) => p !== ring.path);
      if (ring.filterDays !== undefined) {
        children = this.filterByDays(children, ring.filterDays, fileMeta);
      }
      this.sortChildren(children, ring.sort, fileMeta);
      this.childPathsCache.set(ring.path, children);
    }
  }

  // Membership filter, applied before sortChildren: keeps only children dated
  // within the last `days` days, using the same created -> updated -> mtime
  // fallback chain sortChildren uses for ordering. Unlike the sort fallback
  // (which just tie-breaks on name), this needs a real in/out decision, so a
  // file with no created/updated frontmatter falls back to mtime rather than
  // being dropped outright — mtime is a real, if noisier (OneDrive sync can
  // touch it independent of content), last resort.
  // Calendar-day cutoff, not a rolling `days * 24h` window — `created`/
  // `updated` frontmatter is a date-only string (parses as UTC midnight), so
  // comparing it against a raw Date.now()-based cutoff made the boundary
  // shift with whatever time of day you happened to check: the same log
  // could fall in or out of a "7 day" window depending on whether it was
  // 1am or 11pm. Truncating both "today" and each file's date to UTC
  // midnight before comparing makes `days` mean N distinct calendar dates
  // (today + the N-1 preceding), deterministic regardless of time of day.
  private filterByDays(
    children: string[],
    days: number,
    fileMeta: Map<string, { created?: string; updated?: string; mtime: number }>
  ): string[] {
    const now = new Date();
    const todayUTCMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const cutoff = todayUTCMidnight - (days - 1) * 24 * 60 * 60 * 1000;
    return children.filter((path) => {
      const meta = fileMeta.get(path);
      if (!meta) return false;
      const dateStr = meta.created ?? meta.updated;
      const parsed = dateStr ? Date.parse(dateStr) : NaN;
      const time = !isNaN(parsed) ? parsed : meta.mtime;
      const day = new Date(time);
      const dayUTCMidnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
      return dayUTCMidnight >= cutoff;
    });
  }

  // Mutates `children` in place. "created"/"updated"/"modified" fall back to
  // path-name ordering when a file is missing the relevant metadata (no
  // `created`/`updated` frontmatter, e.g.), so a ring never silently
  // reorders around one gap.
  private sortChildren(
    children: string[],
    sort: RingSort,
    fileMeta: Map<string, { created?: string; updated?: string; mtime: number }>
  ): void {
    if (sort === "name") {
      children.sort();
      return;
    }
    children.sort((a, b) => {
      const ma = fileMeta.get(a);
      const mb = fileMeta.get(b);
      const va =
        sort === "created" ? ma?.created : sort === "updated" ? ma?.updated : ma?.mtime.toString();
      const vb =
        sort === "created" ? mb?.created : sort === "updated" ? mb?.updated : mb?.mtime.toString();
      if (va === undefined && vb === undefined) return a.localeCompare(b);
      if (va === undefined) return 1;
      if (vb === undefined) return -1;
      return va < vb ? -1 : va > vb ? 1 : a.localeCompare(b);
    });
  }

  getRings(): RingData[] {
    return Array.from(this.rings.values());
  }

  getRing(path: string): RingData | undefined {
    return this.rings.get(path);
  }

  isRing(path: string): boolean {
    return this.rings.has(path);
  }

  getChildPaths(ring: RingData): string[] {
    return this.childPathsCache.get(ring.path) ?? [];
  }

  // Place N children equally spaced on the circumference of the ring plane.
  // The plane is defined by ring.normal and centered at `center`.
  computeChildPositions(
    ring: RingData,
    center: { x: number; y: number; z: number },
    childPaths: string[]
  ): NodePositions {
    if (childPaths.length === 0) return {};

    const c = new THREE.Vector3(center.x, center.y, center.z);
    const n = ring.normal.clone().normalize();

    // Build two orthogonal basis vectors spanning the ring plane
    const arbitrary = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(arbitrary, n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();

    const result: NodePositions = {};
    childPaths.forEach((path, i) => {
      const angle = (2 * Math.PI * i) / childPaths.length;
      const p = c
        .clone()
        .addScaledVector(u, ring.radius * Math.cos(angle))
        .addScaledVector(v, ring.radius * Math.sin(angle));
      result[path] = { x: p.x, y: p.y, z: p.z };
    });
    return result;
  }

  // Shared child-snap step: compute this ring's child positions and, unless
  // persist is "none", write them through to positions.json (and frontmatter,
  // if requested) via NodePositionManager. Replaces four near-identical copies
  // of "compute, assign, maybe persist" that used to live one per call site
  // (drag, drag-end, Reload rings, apply-ring-layouts) — the split was exactly
  // how the July 2 bug happened (drag-end persisted frontmatter, Reload rings
  // didn't). Callers still own mutating their own live three.js node objects
  // and any rendering/refresh side effects; this only computes + persists.
  snapRing(
    ring: RingData,
    center: { x: number; y: number; z: number },
    opts: { persist: "none" | "positions" | "frontmatter" } = { persist: "none" }
  ): NodePositions {
    const childPaths = this.getChildPaths(ring);
    const positions = this.computeChildPositions(ring, center, childPaths);
    if (opts.persist === "none") return positions;

    const posManager = this.plugin.nodePositionManager;
    for (const [path, pos] of Object.entries(positions)) {
      posManager.setPosition(path, pos.x, pos.y, pos.z);
      if (opts.persist === "frontmatter") {
        posManager.writeFrontmatter(path, pos.x, pos.y, pos.z);
      }
    }
    posManager.saveDebounced();
    return positions;
  }

  setNormal(path: string, normal: THREE.Vector3): void {
    const ring = this.rings.get(path);
    if (ring) ring.normal = normal.clone().normalize();
  }

  async persistNormal(path: string, normal: THREE.Vector3): Promise<void> {
    const file = this.plugin.app.vault.getAbstractFileByPath(path) as TFile | null;
    if (!file || !path.endsWith(".md")) return;
    const n = normal.normalize();
    this.plugin.beginFrontmatterWrite();
    try {
      await this.plugin.app.fileManager.processFrontMatter(file, (fm) => {
        fm["ring-normal"] = [
          parseFloat(n.x.toFixed(4)),
          parseFloat(n.y.toFixed(4)),
          parseFloat(n.z.toFixed(4)),
        ];
      });
      this.plugin.markRecentlySaved(path);
    } finally {
      this.plugin.endFrontmatterWrite();
    }
  }
}
