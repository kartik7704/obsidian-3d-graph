/**
 * the Coords type in 3d-force-graph
 */
type Coords = {
  x: number;
  y: number;
  z: number;
};

declare module "d3-force-3d" {
  export function forceSimulation<N>(nodes?: N[]): any;
  export function forceLink<N, L>(links?: L[]): any;
  export function forceManyBody(): any;
  export function forceCenter(x?: number, y?: number, z?: number): any;
  export function forceCollide(radius?: number | ((node: any) => number)): any;
  export function forceX(x?: number | ((node: any) => number)): any;
  export function forceY(y?: number | ((node: any) => number)): any;
  export function forceZ(z?: number | ((node: any) => number)): any;
  export function forceRadial(radius: number | ((node: any) => number), x?: number, y?: number, z?: number): any;
}
