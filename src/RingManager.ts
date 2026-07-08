import type Graph3dPlugin from "@/main";
import * as THREE from "three";
import type { TFile } from "obsidian";
import type { NodePositions } from "@/NodePositionManager";

export type RingData = {
  path: string;
  radius: number;
  filter: string; // tag to match children (without #), e.g. "log"
  normal: THREE.Vector3;
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

    // Single pass: collect ring definitions and bucket every file by its tags
    // at the same time, instead of a second full-vault scan per ring later.
    const filesByTag: Map<string, string[]> = new Map();

    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;
      const fm = cache.frontmatter;

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

      this.rings.set(file.path, { path: file.path, radius, filter, normal });
    }

    for (const ring of this.rings.values()) {
      if (!ring.filter) {
        this.childPathsCache.set(ring.path, []);
        continue;
      }
      const children = (filesByTag.get(ring.filter) ?? []).filter((p) => p !== ring.path);
      children.sort();
      this.childPathsCache.set(ring.path, children);
    }
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
