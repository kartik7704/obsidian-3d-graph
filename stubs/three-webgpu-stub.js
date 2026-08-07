// Obsidian plugins ship with no node_modules, so a genuine `three/webgpu` import can
// never resolve at runtime the way esbuild's `external` assumed it could. We never
// actually use WebGPU (three-render-objects only instantiates it when `useWebGPU: true`
// is explicitly passed, which this plugin never does), so this stub stands in for the
// real module purely to satisfy the static import without shipping the real WebGPU
// renderer bundle for a code path that's dead weight here.
export class WebGPURenderer {
  constructor() {
    throw new Error(
      "3d-graph-new: WebGPURenderer is stubbed out (unused in this plugin) — this should be unreachable."
    );
  }
}
