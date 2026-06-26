import type Graph3dPlugin from "@/main";
import * as THREE from "three";
import type { NodePositions } from "@/NodePositionManager";

export type RingData = {
  path: string;
  radius: number;
  filter: string;       // tag to match children (without #), e.g. "log"
  normal: THREE.Vector3;
};

export class RingManager {
  private plugin: Graph3dPlugin;
  private rings: Map<string, RingData> = new Map();

  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
  }

  async load(): Promise<void> {
    this.rings.clear();
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;
      const fm = cache.frontmatter;

      const tags: string[] = Array.isArray(fm.tags)
        ? fm.tags
        : typeof fm.tags === "string"
        ? [fm.tags]
        : [];
      if (!tags.includes("ring")) continue;

      const radius: number = typeof fm.radius === "number" ? fm.radius : 150;
      const filter: string =
        typeof fm["ring-filter"] === "string"
          ? fm["ring-filter"].replace(/^#/, "")
          : "";
      const nArr: number[] = Array.isArray(fm["ring-normal"]) ? fm["ring-normal"] : [0, 1, 0];
      const normal = new THREE.Vector3(nArr[0] ?? 0, nArr[1] ?? 1, nArr[2] ?? 0).normalize();

      this.rings.set(file.path, { path: file.path, radius, filter, normal });
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
    if (!ring.filter) return [];
    const children: string[] = [];
    for (const file of this.plugin.app.vault.getMarkdownFiles()) {
      if (file.path === ring.path) continue;
      const cache = this.plugin.app.metadataCache.getFileCache(file);
      if (!cache?.frontmatter) continue;
      const tags: string[] = Array.isArray(cache.frontmatter.tags)
        ? cache.frontmatter.tags
        : typeof cache.frontmatter.tags === "string"
        ? [cache.frontmatter.tags]
        : [];
      if (tags.includes(ring.filter)) children.push(file.path);
    }
    return children;
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
    const arbitrary = Math.abs(n.y) < 0.9
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(arbitrary, n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();

    const result: NodePositions = {};
    childPaths.forEach((path, i) => {
      const angle = (2 * Math.PI * i) / childPaths.length;
      const p = c.clone()
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
}
