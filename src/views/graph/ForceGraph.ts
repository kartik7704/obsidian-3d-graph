import type { ForceGraph3DInstance } from "3d-force-graph";
import ForceGraph3D from "3d-force-graph";
import { Graph } from "@/graph/Graph";
import { CenterCoordinates } from "@/views/graph/CenterCoordinates";
import * as THREE from "three";
import * as d3 from "d3-force-3d";
import { hexToRGBA } from "@/util/hexToRGBA";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { FOCAL_FROM_CAMERA, ForceGraphEngine } from "@/views/graph/ForceGraphEngine";
import type { DeepPartial } from "ts-essentials";
import type { Node } from "@/graph/Node";

import { rgba } from "polished";
import { createNotice } from "@/util/createNotice";
import type { GlobalGraphSettings, GraphSetting, LocalGraphSettings } from "@/SettingsSchemas";
import { DagOrientation } from "@/SettingsSchemas";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { BaseGraph3dView, Graph3dView } from "@/views/graph/3dView/Graph3dView";
import type { ItemView, TFile } from "obsidian";
import type { GraphSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";
import { syncOf } from "@/util/awaitof";
import type { NodePositions } from "@/NodePositionManager";
import { SpatialNoteManager } from "@/views/graph/SpatialNoteManager";

export const getTooManyNodeMessage = (nodeNumber: number) =>
  `Graph is too large to be rendered. Have ${nodeNumber} nodes.`;

// How long a new node is left to the simulation before updateGraph pins it
// (dontMoveWhenDrag) so it doesn't keep drifting once fixed - long enough for
// the initial hot-alpha layout burst to settle.
const NEW_NODE_SETTLE_MS = 2000;

// Deterministic string -> [0, 1) hash (FNV-1a), used to seed a stable,
// spread-out starting position for nodes with no saved position — same
// path always lands in the same spot, so it doesn't visually "shuffle"
// unpositioned nodes across reloads the way `Math.random()` would.
function hashPathToUnit(path: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0xffffffff;
}

type MyForceGraph3DInstance = Omit<ForceGraph3DInstance, "graphData"> & {
  graphData: {
    (): Graph; // When no argument is passed, it returns a Graph
    (graph: Graph): MyForceGraph3DInstance; // When a Graph is passed, it returns MyForceGraph3DInstance
  };
};

export type BaseForceGraph = ForceGraph<BaseGraph3dView>;

/**
 * this class control the config and graph of the force graph. The interaction is not control here.
 */
export class ForceGraph<V extends Graph3dView<GraphSettingManager<GraphSetting, V>, ItemView>> {
  // Ring rotation handles shrink to near-nothing (instead of visible=false)
  // when rings are toggled off, so there's no accidental-drag risk without
  // fighting reach/grabbability up close. Shared so a freshly-created handle
  // (on reload) can start at the correct scale immediately instead of
  // defaulting to full size for one frame until onBeforeRender catches up.
  private static readonly HIDDEN_HANDLE_SCALE = 0.01;

  /**
   * this can be a local graph or a global graph
   */
  public readonly view: V;
  // private config: LocalGraphSettings | GlobalGraphSettings;

  public readonly instance: MyForceGraph3DInstance;
  public readonly centerCoordinates: CenterCoordinates;
  public readonly myCube: THREE.Mesh;

  public readonly interactionManager: ForceGraphEngine;
  public readonly spatialNotes: SpatialNoteManager;
  // Tracks the last dagOrientation actually applied to instance.dagMode(),
  // so updateInstance can skip calling it again on the no-op "still off"
  // case — see the comment at its call site for why that call must be
  // avoided whenever possible.
  private lastAppliedDagOrientation: DagOrientation | undefined = undefined;
  private readonly ringMeshes: Map<string, THREE.Mesh> = new Map();
  private readonly ringHandles: Map<string, { green: THREE.Mesh; blue: THREE.Mesh }> = new Map();
  private readonly raycaster = new THREE.Raycaster();
  // Absolute angle-tracking, same technique every 3D tool with a rotation
  // gizmo uses (Roblox, Unity, Blender, Unreal): each frame, raycast from the
  // camera through the mouse, intersect a plane perpendicular to a FIXED
  // rotation axis (chosen once at drag-start, never re-derived mid-drag),
  // and read off the absolute angle around that plane. Rotating by the delta
  // between this frame's angle and the last is inherently camera-angle-
  // independent and immune to the mid-drag basis discontinuity the previous
  // incremental-delta approach had — the only real limitation is the
  // inherent singularity every such gizmo shares: looking exactly down the
  // rotation axis leaves no angle to read.
  private ringDragState: {
    ringPath: string;
    axis: "green" | "blue";
    rotationAxis: THREE.Vector3;
    center: THREE.Vector3;
    planeA: THREE.Vector3;
    planeB: THREE.Vector3;
    lastAngle: number;
  } | null = null;
  public nodeLabelEl: HTMLDivElement;
  private destroyed = false;

  private readonly onRendererWheel = (event: WheelEvent): void => {
    this.interactionManager.onZoom(event);
  };

  /**
   *
   * this will create a new force graph instance and render it to the view
   * @param view
   * @param config you have to provide the full config here!!
   */
  constructor(view: V, _graph: Graph) {
    this.view = view;
    this.interactionManager = new ForceGraphEngine(this);

    const pluginSetting = this.view.plugin.settingManager.getSettings().pluginSetting;
    const determineTooManyNode = () => {
      const tooMany = _graph.nodes.length > pluginSetting.maxNodeNumber;
      if (tooMany) createNotice(getTooManyNodeMessage(_graph.nodes.length));
    };

    determineTooManyNode();

    const graph = _graph;
    this.applyNodePositions(graph);

    // create the div element for the node label
    const { divEl, nodeLabelEl } = this.createNodeLabel();
    this.nodeLabelEl = nodeLabelEl;
    const css3dRenderer = new CSS3DRenderer();
    css3dRenderer.domElement.className = "spatial-note-css3d-renderer";
    // create the instance
    // these config will not changed by user
    this.instance = ForceGraph3D({
      controlType: pluginSetting.rightClickToPan ? undefined : "orbit",
      extraRenderers: [
        // @ts-ignore https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/html-nodes/index.html#L27C9-L29
        new CSS2DRenderer({
          element: divEl,
        }),
        css3dRenderer,
      ],
    })(this.view.contentEl)
      .graphData(graph)
      .nodeColor(this.interactionManager.getNodeColor)
      // @ts-ignore
      .nodeLabel((node) => null)
      // node size is proportional to the number of links
      .nodeVal(this.getNodeVal)
      .nodeVisibility(this.getNodeVisibility)
      .onBackgroundRightClick(() => {
        this.interactionManager.removeSelection();
      })
      .nodeOpacity(0.9)
      .linkOpacity(0.3)
      .onNodeHover((node: Node | null) => {
        try {
          this.interactionManager.onNodeHover(node);
        } catch (err) {
          console.error("[3d-graph] onNodeHover threw, render loop would have died here:", err);
        }
      })
      .onNodeDrag(this.interactionManager.onNodeDrag)
      .onNodeDragEnd(this.interactionManager.onNodeDragEnd)
      .onNodeRightClick(this.interactionManager.onNodeRightClick)
      .onNodeClick(this.interactionManager.onNodeClick)
      // .onLinkHover(this.interactionManager.onLinkHover)
      .linkVisibility(this.getLinkVisibility)
      .linkColor(this.interactionManager.getLinkColor)
      .linkWidth(this.interactionManager.getLinkWidth)
      .linkDirectionalParticles(this.interactionManager.getLinkDirectionalParticles)
      .linkDirectionalParticleWidth(this.interactionManager.getLinkDirectionalParticleWidth)
      .linkDirectionalArrowLength(this.interactionManager.getLinkDirectionalArrowLength)
      .linkDirectionalArrowRelPos(1)
      // the options here are auto
      .width(this.view.contentEl.innerWidth)
      .height(this.view.contentEl.innerHeight)
      .d3Force("collide", d3.forceCollide(5))
      //   transparent
      .backgroundColor(hexToRGBA("#000000", 0)) as unknown as MyForceGraph3DInstance;

    const scene = this.instance.scene();
    const renderer = this.instance.renderer();
    renderer.setClearColor(new THREE.Color(0x000000), 0);
    renderer.domElement.style.position = "relative";
    renderer.domElement.style.zIndex = "1";
    css3dRenderer.domElement.style.zIndex = "0";
    const rendererParent = renderer.domElement.parentElement;
    if (rendererParent && css3dRenderer.domElement.parentElement === rendererParent) {
      rendererParent.insertBefore(css3dRenderer.domElement, renderer.domElement);
    }
    this.spatialNotes = new SpatialNoteManager({
      app: this.view.plugin.app,
      containerEl: this.view.contentEl,
      scene,
      camera: () => this.instance.camera() as THREE.PerspectiveCamera,
      rendererCanvas: renderer.domElement,
      nodes: () => this.instance.graphData().nodes as Node[],
      onNodeHover: this.interactionManager.onSpatialNoteHover,
      panelRespawnDistance: () =>
        this.view.plugin.settingManager.getSettings().pluginSetting.spatialNoteRespawnDistance,
    });
    this.interactionManager.bindRenderer(renderer.domElement);
    renderer.domElement.addEventListener("wheel", this.onRendererWheel);
    // add others things
    // add center coordinates
    this.centerCoordinates = new CenterCoordinates(
      this.view.settingManager.getCurrentSetting().display.showCenterCoordinates,
      this.view.settingManager.getCurrentSetting().display.centerCoordinatesLength
    );
    scene.add(this.centerCoordinates.arrowsGroup);

    this.myCube = this.createCube();
    scene.add(this.myCube);

    this.initRingMeshes(scene);
    this.snapRingChildren();
    // registered once here, not inside initRingMeshes — that gets called again
    // on every "Reload rings" click (reloadRingMeshes), which used to stack a
    // fresh set of these listeners each time since they were never removed.
    // These handlers read this.ringHandles/this.ringDragState live off the
    // instance, so they don't need re-registering when the meshes reload.
    const ringDomEl = this.instance.renderer().domElement;
    ringDomEl.addEventListener("pointermove", this.onHandleMouseMove, { capture: true });
    ringDomEl.addEventListener("pointerdown", this.onHandleMouseDown, { capture: true });
    ringDomEl.addEventListener("pointerup", this.onHandleMouseUp, { capture: true });

    // add node label
    this.instance
      .nodeThreeObject((node: Node) => {
        const nodeEl = createDiv();

        if (this.view.plugin.ringManager.isRing(node.path)) {
          nodeEl.style.display = "none";
          return new CSS2DObject(nodeEl);
        }

        const text = this.interactionManager.getNodeLabelText(node);
        nodeEl.textContent = text;
        // @ts-ignore
        nodeEl.style.color = node.color;
        nodeEl.className = "node-label";
        nodeEl.style.top = "20px";
        nodeEl.style.fontSize = "12px";
        nodeEl.style.padding = "1px 4px";
        nodeEl.style.borderRadius = "4px";
        nodeEl.style.backgroundColor = rgba(0, 0, 0, 0.5);
        nodeEl.style.userSelect = "none";

        const cssObject = new CSS2DObject(nodeEl);
        cssObject.onAfterRender = (renderer, scene, camera) => {
          nodeEl.style.visibility = this.spatialNotes.isNodeLabelOccluded(node)
            ? "hidden"
            : "visible";
          const value = 1 - this.interactionManager.getNodeOpacityEasedValue(node);
          nodeEl.style.opacity = `${
            this.interactionManager.getIsAnyHighlighted() &&
            !this.interactionManager.isHighlightedNode(node)
              ? Math.clamp(value, 0, 0.2)
              : this.interactionManager.hoveredNode === node
              ? 1
              : value
          }`;
        };

        node.labelEl = nodeEl;
        // add an on hover event to the label element
        // when hover, trigger hover link and show the preview

        return cssObject;
      })
      .nodeThreeObjectExtend(true);
    this.spatialNotes.syncNodes();

    // init other setting
    this.updateConfig(this.view.settingManager.getCurrentSetting());

    // this disable the right click to pan
    if (!pluginSetting.rightClickToPan) {
      const controls = this.instance.controls() as OrbitControls;
      controls.mouseButtons.RIGHT = undefined;
      // also if right click to pan cmd + left pan should be disabled
      // to disable it, we just need to remove the orbit controls
    }

    //  change the nav info text
    this.view.contentEl
      .querySelector(".scene-nav-info")
      ?.setText(
        `Left-click: rotate, Mouse-wheel/middle-click: zoom, ${
          pluginSetting.rightClickToPan ? "Right click" : "Cmd + left click"
        }: pan, F: freecam, Q/E: roll, R: level, P: trail, Shift: faster`
      );
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    const rendererDomEl = this.instance.renderer().domElement;
    rendererDomEl.removeEventListener("wheel", this.onRendererWheel);
    rendererDomEl.removeEventListener("pointermove", this.onHandleMouseMove, { capture: true });
    rendererDomEl.removeEventListener("pointerdown", this.onHandleMouseDown, { capture: true });
    rendererDomEl.removeEventListener("pointerup", this.onHandleMouseUp, { capture: true });

    this.interactionManager.destroy();
    this.spatialNotes.destroy();
    this.instance._destructor();
  }

  private getRingBasis(normal: THREE.Vector3): { u: THREE.Vector3; v: THREE.Vector3 } {
    const n = normal.clone().normalize();
    const arbitrary = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(arbitrary, n).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();
    return { u, v };
  }

  private initRingMeshes(scene: THREE.Scene): void {
    const rings = this.view.plugin.ringManager.getRings();
    const posManager = this.view.plugin.nodePositionManager;

    for (const ring of rings) {
      // torus — depthWrite off so it never occludes nodes or links behind it
      const tubeR = this.view.settingManager.getCurrentSetting().display.ringTubeRadius ?? 1.5;
      const geometry = new THREE.TorusGeometry(ring.radius, tubeR, 8, 64);
      const material = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);

      // green handle: drag to rotate around ring's v axis
      const greenHandle = new THREE.Mesh(
        new THREE.SphereGeometry(6, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00cc44 })
      );
      // blue handle: drag to rotate around ring's u axis
      const blueHandle = new THREE.Mesh(
        new THREE.SphereGeometry(6, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x4488ff })
      );

      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.normal);
      const pos = posManager.getEffectivePosition(ring.path) ?? { x: 0, y: 0, z: 0 };
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.setRotationFromQuaternion(q);

      const { u, v } = this.getRingBasis(ring.normal);
      const center = new THREE.Vector3(pos.x, pos.y, pos.z);
      greenHandle.position.copy(center.clone().addScaledVector(u, ring.radius));
      blueHandle.position.copy(center.clone().addScaledVector(v, ring.radius));

      const showRing = this.view.settingManager.getCurrentSetting().display.showRing ?? true;
      mesh.visible = showRing;
      // handles stay technically visible; per-frame scaling in createCube()'s onBeforeRender
      // shrinks them to near-nothing when showRing is off, instead of hiding them outright.
      // Set the correct scale immediately too — otherwise a freshly-created handle
      // (e.g. on "Reload rings") renders at its default full scale for one frame
      // before onBeforeRender's next tick catches it, which flashes visibly.
      const initialScale = showRing ? 1 : ForceGraph.HIDDEN_HANDLE_SCALE;
      greenHandle.scale.setScalar(initialScale);
      blueHandle.scale.setScalar(initialScale);

      scene.add(mesh);
      scene.add(greenHandle);
      scene.add(blueHandle);
      this.ringMeshes.set(ring.path, mesh);
      this.ringHandles.set(ring.path, { green: greenHandle, blue: blueHandle });
    }
  }

  // Ring meshes (initRingMeshes, just above) place the ring's own torus at
  // its correct center on every open, but child nodes never got the same
  // treatment — they just sat wherever applyNodePositions last put them
  // (frontmatter/positions.json), which drifts from the ring's actual
  // current center/radius/rotation whenever a child was dragged off and
  // nothing has re-snapped it since. Called from both the constructor
  // (first-ever ForceGraph construction) and updateGraph (the path actually
  // taken when Graph3dView reuses an existing ForceGraph instance instead of
  // constructing a new one, e.g. closing/reopening the same graph leaf) —
  // the constructor alone doesn't cover the reuse case. persist: "positions"
  // (not "frontmatter") matches apply-ring-layouts' default — opening a
  // graph view shouldn't silently rewrite every log note's frontmatter.
  private snapRingChildren(): void {
    const posManager = this.view.plugin.nodePositionManager;
    const ringManager = this.view.plugin.ringManager;
    const snapped: NodePositions = {};
    for (const ring of ringManager.getRings()) {
      const ringPos = posManager.getEffectivePosition(ring.path);
      if (!ringPos) continue;
      Object.assign(snapped, ringManager.snapRing(ring, ringPos, { persist: "positions" }));
    }
    if (Object.keys(snapped).length === 0) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance.graphData().nodes.forEach((node: any) => {
      const pos = snapped[node.path];
      if (!pos) return;
      node.fx = pos.x;
      node.fy = pos.y;
      node.fz = pos.z;
      node.x = pos.x;
      node.y = pos.y;
      node.z = pos.z;
    });
  }

  public updateRingMeshPositions(): void {
    const posManager = this.view.plugin.nodePositionManager;
    for (const ring of this.view.plugin.ringManager.getRings()) {
      const mesh = this.ringMeshes.get(ring.path);
      const handles = this.ringHandles.get(ring.path);
      const pos = posManager.getEffectivePosition(ring.path);
      if (!pos || !mesh) continue;
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ring.normal);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.setRotationFromQuaternion(q);
      if (handles) {
        const { u, v } = this.getRingBasis(ring.normal);
        const center = new THREE.Vector3(pos.x, pos.y, pos.z);
        handles.green.position.copy(center.clone().addScaledVector(u, ring.radius));
        handles.blue.position.copy(center.clone().addScaledVector(v, ring.radius));
      }
    }
  }

  public reloadRingMeshes(): void {
    const scene = this.instance.scene();
    for (const mesh of this.ringMeshes.values()) scene.remove(mesh);
    for (const handles of this.ringHandles.values()) {
      scene.remove(handles.green);
      scene.remove(handles.blue);
    }
    this.ringMeshes.clear();
    this.ringHandles.clear();
    this.initRingMeshes(scene);
  }

  private getMouseNDC(event: MouseEvent): THREE.Vector2 {
    const rect = this.instance.renderer().domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private onHandleMouseMove = (event: MouseEvent): void => {
    if (!this.ringDragState) return;
    this.handleRingRotationDrag(event);
    event.stopPropagation();
  };

  private onHandleMouseDown = (event: MouseEvent): void => {
    const ndc = this.getMouseNDC(event);
    this.raycaster.setFromCamera(ndc, this.instance.camera());
    for (const [ringPath, handles] of this.ringHandles.entries()) {
      const greenHits = this.raycaster.intersectObject(handles.green);
      const blueHits = this.raycaster.intersectObject(handles.blue);
      if (greenHits.length > 0 || blueHits.length > 0) {
        const axis = greenHits.length > 0 ? "green" : "blue";
        const ring = this.view.plugin.ringManager.getRing(ringPath);
        const normal = ring?.normal ?? new THREE.Vector3(0, 1, 0);
        const { u, v } = this.getRingBasis(normal);
        // green rotates around v, blue rotates around u — fixed for the
        // whole drag, never re-derived from the (changing) normal mid-drag
        const rotationAxis = axis === "green" ? v : u;
        const center =
          this.ringMeshes.get(ringPath)?.position.clone() ?? new THREE.Vector3(0, 0, 0);
        // planeA/planeB are just a 2D basis for measuring angle in the plane
        // perpendicular to rotationAxis — computed once here, so getRingBasis'
        // discontinuous branch (see its own comment) never matters: there's
        // no "mid-drag" for this call, it happens exactly once per drag.
        const { u: planeA, v: planeB } = this.getRingBasis(rotationAxis);
        const initialAngle =
          this.getRotationAngleAtMouse(event, rotationAxis, center, planeA, planeB) ?? 0;
        this.ringDragState = {
          ringPath,
          axis,
          rotationAxis,
          center,
          planeA,
          planeB,
          lastAngle: initialAngle,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.instance.controls() as any).enabled = false;
        event.stopPropagation();
        event.preventDefault();
        return;
      }
    }
  };

  private onHandleMouseUp = (): void => {
    if (this.ringDragState) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.instance.controls() as any).enabled = true;
      this.view.plugin.nodePositionManager.saveDebounced();
      const ring = this.view.plugin.ringManager.getRing(this.ringDragState.ringPath);
      if (ring) {
        this.view.plugin.ringManager.persistNormal(ring.path, ring.normal);

        // handleRingRotationDrag updates each child's live position and
        // positions.json on every mousemove during the drag, but never
        // writes their frontmatter graph_pos — only the ring's own
        // ring-normal gets persisted above. Since frontmatter is the
        // source of truth on reload (getEffectivePosition), a rotated
        // ring's children would silently snap back to their pre-rotation
        // position after restarting Obsidian. Mirror onNodeDragEnd's
        // behavior here, gated by the same settings.
        const setting = this.view.settingManager.getCurrentSetting();
        if (setting.display.saveCoordinatesToFrontmatter && setting.display.dontMoveWhenDrag) {
          const posManager = this.view.plugin.nodePositionManager;
          const childPaths = this.view.plugin.ringManager.getChildPaths(ring);
          const positions = posManager.getAll();
          for (const path of childPaths) {
            const pos = positions[path];
            if (pos) posManager.writeFrontmatter(path, pos.x, pos.y, pos.z);
          }
        }
      }
      this.ringDragState = null;

      // handleRingRotationDrag mutates children's node.x/y/z directly every
      // frame during the drag, but never forces the renderer to re-sync
      // their three.js meshes — same gap applyLivePositions had earlier
      // tonight. Once the simulation has settled, a data-only mutation
      // doesn't visibly move a node until something else (Reset rings,
      // hovering a node) forces a fresh render. .refresh() forces that sync
      // immediately on release instead of waiting for an unrelated action to
      // trigger it.
      this.instance.refresh();
    }
  };

  // Ray from the camera through the mouse, intersected with a plane
  // perpendicular to the drag's fixed rotation axis — returns the absolute
  // angle of that hit point around the plane (using planeA/planeB as the
  // plane's own 2D basis), or null if the ray is parallel to the plane (the
  // genuine edge-on singularity every rotation gizmo shares: no angle can be
  // read when looking exactly down the rotation axis).
  private getRotationAngleAtMouse(
    event: MouseEvent,
    rotationAxis: THREE.Vector3,
    center: THREE.Vector3,
    planeA: THREE.Vector3,
    planeB: THREE.Vector3
  ): number | null {
    const ndc = this.getMouseNDC(event);
    this.raycaster.setFromCamera(ndc, this.instance.camera());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(rotationAxis, center);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, hit)) return null;
    const rel = hit.sub(center);
    return Math.atan2(rel.dot(planeB), rel.dot(planeA));
  }

  private handleRingRotationDrag(event: MouseEvent): void {
    if (!this.ringDragState) return;
    const { rotationAxis, center, planeA, planeB } = this.ringDragState;

    const angle = this.getRotationAngleAtMouse(event, rotationAxis, center, planeA, planeB);
    if (angle === null) return; // edge-on this frame — skip rather than guess

    let deltaAngle = angle - this.ringDragState.lastAngle;
    // normalize to [-π, π] so crossing the atan2 wraparound point doesn't
    // register as a near-360° jump
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    this.ringDragState.lastAngle = angle;
    if (Math.abs(deltaAngle) < 1e-5) return;

    const ring = this.view.plugin.ringManager.getRing(this.ringDragState.ringPath);
    if (!ring) return;

    const q = new THREE.Quaternion().setFromAxisAngle(rotationAxis, deltaAngle);
    const newNormal = ring.normal.clone().applyQuaternion(q).normalize();
    this.view.plugin.ringManager.setNormal(ring.path, newNormal);

    // Capture the handles' actual rendered positions BEFORE
    // updateRingMeshPositions runs — that call re-derives handle positions
    // via getRingBasis(), which can still jump discontinuously (hard
    // threshold on its reference vector). Rotating from a position that's
    // already been corrupted by that jump just carries the jump forward;
    // rotating from the clean pre-update position is what actually stays
    // continuous.
    const handles = this.ringHandles.get(ring.path);
    const preGreenPos = handles?.green.position.clone();
    const preBluePos = handles?.blue.position.clone();

    this.updateRingMeshPositions();

    if (handles && preGreenPos && preBluePos) {
      const rotateAboutCenter = (mesh: THREE.Mesh, prevPos: THREE.Vector3) => {
        const offset = prevPos.clone().sub(center);
        offset.applyQuaternion(q);
        mesh.position.copy(center.clone().add(offset));
      };
      rotateAboutCenter(handles.green, preGreenPos);
      rotateAboutCenter(handles.blue, preBluePos);
    }

    // re-snap children — update positions directly, ForceGraph3D renders each frame
    const positions = this.view.plugin.nodePositionManager.getAll();
    const ringPos = positions[ring.path];
    if (!ringPos) return;
    const childPaths = this.view.plugin.ringManager.getChildPaths(ring);
    const childPositions = this.view.plugin.ringManager.computeChildPositions(
      ring,
      ringPos,
      childPaths
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.instance.graphData().nodes as any[]).forEach((n: any) => {
      const pos = childPositions[n.path];
      if (pos) {
        n.x = pos.x;
        n.y = pos.y;
        n.z = pos.z;
        n.fx = pos.x;
        n.fy = pos.y;
        n.fz = pos.z;
        this.view.plugin.nodePositionManager.setPosition(n.path, pos.x, pos.y, pos.z);
      }
    });
  }

  private createNodeLabel() {
    const divEl = createDiv();
    divEl.style.zIndex = "2";
    const nodeLabelEl = divEl.createDiv({
      cls: "node-label",
      text: "",
    });
    nodeLabelEl.style.opacity = "0";
    return { divEl, nodeLabelEl };
  }

  private getNodeVal = (node: Node): number => {
    return (
      (node.links.length + 1) *
      ("currentFile" in this.view && (this.view.currentFile as TFile)?.path === node.path ? 3 : 1)
    );
  };

  private getNodeVisibility = (node: Node): boolean => {
    const showRing = this.view.settingManager.getCurrentSetting().display.showRing ?? true;
    if (!showRing && this.view.plugin.ringManager.isRing(node.path)) return false;
    return true;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getLinkVisibility = (link: any): boolean => {
    const showRing = this.view.settingManager.getCurrentSetting().display.showRing ?? true;
    if (!showRing) {
      const srcPath = link.source?.path ?? link.source;
      const tgtPath = link.target?.path ?? link.target;
      if (
        this.view.plugin.ringManager.isRing(srcPath) ||
        this.view.plugin.ringManager.isRing(tgtPath)
      )
        return false;
    }
    return true;
  };

  private createCube() {
    // add cube
    const myCube = new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    myCube.position.set(0, 0, -FOCAL_FROM_CAMERA);

    const oldOnBeforeRender = this.instance.scene().onBeforeRender;

    this.instance.scene().onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
      // first run the old onBeforeRender
      oldOnBeforeRender(renderer, scene, camera, geometry, material, group);

      this.interactionManager.updateFreecam();
      this.spatialNotes.update(camera as THREE.PerspectiveCamera);

      const cwd = new THREE.Vector3();
      camera.getWorldDirection(cwd);
      cwd.multiplyScalar(FOCAL_FROM_CAMERA);
      cwd.add(camera.position);
      myCube.position.set(cwd.x, cwd.y, cwd.z);
      myCube.setRotationFromQuaternion(camera.quaternion);

      // ring rotation handles stay their normal fixed world-space size when shown —
      // when showRing is off, shrink them to near-nothing instead of hiding them outright,
      // so there's no accidental drag risk without fighting reach/grabbability up close.
      const showRing = this.view.settingManager.getCurrentSetting().display.showRing ?? true;
      for (const handles of this.ringHandles.values()) {
        const scale = showRing ? 1 : ForceGraph.HIDDEN_HANDLE_SCALE;
        handles.green.scale.setScalar(scale);
        handles.blue.scale.setScalar(scale);
      }
    };
    myCube.visible = false;
    return myCube;
  }

  /**
   * update the dimensions of the graph
   */
  public updateDimensions(dimension?: [number, number]) {
    if (dimension) this.instance.width(dimension[0]).height(dimension[1]);
    else {
      const rootHtmlElement = this.view.contentEl as HTMLDivElement;
      const [width, height] = [rootHtmlElement.offsetWidth, rootHtmlElement.offsetHeight];
      this.instance.width(width).height(height);
    }
  }

  public updateConfig(config: DeepPartial<LocalGraphSettings | GlobalGraphSettings>) {
    const { error } = syncOf(() => this.updateInstance(undefined, config));
    if (error) {
      console.error(error);
    }
  }

  /**
   * given a new force Graph, the update the graph and the instance
   */
  public updateGraph(graph: Graph) {
    // some optimization here
    // if the graph is the same, then we don't need to update the graph
    const same = Graph.compare(this.instance.graphData(), graph);
    if (!same) {
      const { error } = syncOf(() => this.updateInstance(graph, undefined));
      if (error) {
        console.error(error);
      }
      this.snapRingChildren();
      // Pin new nodes after simulation settles so they don't drift when dontMoveWhenDrag is on
      const setting = this.view.settingManager.getCurrentSetting();
      if (setting.display.dontMoveWhenDrag) {
        const posManager = this.view.plugin.nodePositionManager;
        const saved = posManager.getAll();
        const newNodePaths = new Set(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          graph.nodes.filter((n) => !saved[(n as any).path]).map((n) => (n as any).path)
        );
        if (newNodePaths.size > 0) {
          setTimeout(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.instance.graphData().nodes as any[]).forEach((node: any) => {
              if (newNodePaths.has(node.path) && node.x !== undefined) {
                node.fx = node.x;
                node.fy = node.y;
                node.fz = node.z;
                posManager.setPosition(node.path, node.x, node.y, node.z);
              }
            });
            posManager.saveDebounced();
          }, NEW_NODE_SETTLE_MS);
        }
      }
    } else console.log("same graph, no need to update");
    this.spatialNotes.syncNodes();
  }

  /**
   * given the changed things, update the instance
   */
  public applyLivePositions(positions: NodePositions): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.instance.graphData().nodes.forEach((node: any) => {
      const pos = positions[node.path];
      if (pos) {
        node.fx = pos.x;
        node.fy = pos.y;
        node.fz = pos.z;
        node.x = pos.x;
        node.y = pos.y;
        node.z = pos.z;
      } else {
        node.fx = undefined;
        node.fy = undefined;
        node.fz = undefined;
      }
    });
    this.instance.numDimensions(3);
    // Mutating node.x/y/z directly doesn't force the renderer to re-sync a
    // node's three.js mesh if the simulation has already settled — it just
    // sits at the stale visual position until something else (reopening the
    // view, dragging something) forces a fresh redraw. .refresh() forces
    // that sync immediately. updateInstance's reheat path already pairs
    // numDimensions(3) with .refresh() for the same reason; this call was
    // just missing it.
    this.instance.refresh();
    this.updateRingMeshPositions();
  }

  private applyNodePositions(graph: Graph): void {
    const posManager = this.view.plugin.nodePositionManager;
    graph.nodes.forEach((node) => {
      const pos = posManager.getEffectivePosition(node.path);

      if (pos) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = node as any;
        n.fx = pos.x;
        n.fy = pos.y;
        n.fz = pos.z;
        n.x = pos.x;
        n.y = pos.y;
        n.z = pos.z;
      } else {
        // No saved position (a never-dragged node — orphans are the common
        // case, since they're hidden until the "show orphans" toggle and so
        // never get a chance to be dragged/pinned). Leaving x/y/z unset here
        // means every such node starts stacked at the simulation's default
        // origin. On a fresh view-open the simulation starts hot (full
        // cooldown/alpha), so a pile of unfixed nodes sitting right next to
        // an already-pinned, dense cluster gets flung outward by full-
        // strength charge repulsion before it cools — the "orphans scatter
        // on reload" bug. A live toggle doesn't show this because the
        // simulation is already cool by then. Seeding a deterministic,
        // spread-out (not clustered, not random-every-load) starting point
        // avoids the pile-up without pinning the node — it's still free to
        // settle wherever the force layout wants.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = node as any;
        const seed = hashPathToUnit(node.path);
        const radius = 300;
        const theta = seed * Math.PI * 2;
        const phi = Math.acos(2 * ((seed * 7919) % 1) - 1);
        n.x = radius * Math.sin(phi) * Math.cos(theta);
        n.y = radius * Math.sin(phi) * Math.sin(theta);
        n.z = radius * Math.cos(phi);
      }
    });
  }

  private updateInstance = (
    graph?: Graph,
    config?: DeepPartial<LocalGraphSettings | GlobalGraphSettings>
  ) => {
    if (graph !== undefined) {
      this.applyNodePositions(graph);
      this.instance.graphData(graph);
    }
    if (config?.display?.nodeSize !== undefined)
      this.instance.nodeRelSize(config.display?.nodeSize);
    if (config?.display?.linkDistance !== undefined) {
      this.instance.d3Force("link")?.distance(config.display?.linkDistance);
    }
    if (config?.display?.nodeRepulsion !== undefined) {
      this.instance.d3Force("charge")?.strength(-config.display?.nodeRepulsion);
      this.instance
        .d3Force("x", d3.forceX(0).strength(1 - config.display?.nodeRepulsion / 3000 + 0.001))
        .d3Force("y", d3.forceY(0).strength(1 - config.display?.nodeRepulsion / 3000 + 0.001))
        .d3Force("z", d3.forceZ(0).strength(1 - config.display?.nodeRepulsion / 3000 + 0.001));
    }
    if (config?.display?.showCenterCoordinates !== undefined) {
      this.centerCoordinates.setVisibility(config.display.showCenterCoordinates);
    }
    if (config?.display?.centerCoordinatesLength !== undefined) {
      this.centerCoordinates.setLength(config.display.centerCoordinatesLength);
    }
    if (config?.display?.showRing !== undefined) {
      const visible = config.display.showRing;
      for (const mesh of this.ringMeshes.values()) mesh.visible = visible;
      // handle scale (not visibility) is driven per-frame off this same setting — see createCube()
      // directly set visibility on ring node spheres and their links — avoids force-graph re-render side effects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.instance.graphData().nodes as any[]).forEach((node: any) => {
        if (this.view.plugin.ringManager.isRing(node.path) && node.__threeObj) {
          node.__threeObj.visible = visible;
        }
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.instance.graphData().links as any[]).forEach((link: any) => {
        const srcPath = link.source?.path ?? link.source;
        const tgtPath = link.target?.path ?? link.target;
        if (
          this.view.plugin.ringManager.isRing(srcPath) ||
          this.view.plugin.ringManager.isRing(tgtPath)
        ) {
          if (link.__lineObj) link.__lineObj.visible = visible;
          if (link.__arrowObj) link.__arrowObj.visible = visible;
        }
      });
    }
    if (config?.display?.ringTubeRadius !== undefined) {
      const tubeR = config.display.ringTubeRadius;
      for (const [path, mesh] of this.ringMeshes.entries()) {
        const ring = this.view.plugin.ringManager.getRing(path);
        if (!ring) continue;
        mesh.geometry.dispose();
        mesh.geometry = new THREE.TorusGeometry(ring.radius, tubeR, 8, 64);
      }
    }

    if ((config as LocalGraphSettings)?.display?.dagOrientation !== undefined) {
      let dagOrientation = config?.display?.dagOrientation ?? DagOrientation.null;
      // check if graph is async or not
      if (
        !this.instance.graphData().isAcyclic() &&
        this.view.settingManager.getCurrentSetting().display.dagOrientation !== DagOrientation.null
      ) {
        createNotice("The graph is cyclic, dag orientation will be ignored");
        dagOrientation = DagOrientation.null;
      }

      const noDag = dagOrientation === DagOrientation.null;
      const wasNoDag =
        this.lastAppliedDagOrientation === undefined ||
        this.lastAppliedDagOrientation === DagOrientation.null;

      // three-forcegraph's dagMode setter has a real bug: calling it at all
      // — even with null — triggers its internal "reheat" step, and that
      // step's own DAG check reads state.dagMode *before* the new value has
      // actually landed internally. On a freshly-constructed instance
      // that stale read is truthy, so the reheat unconditionally clears
      // fx/fy/fz on every single node — confirmed by direct instrumentation:
      // every pinned node lost its fx/fy/fz mid-call, and only afterward did
      // dagMode() read back the correct new value. Since "no DAG" is the
      // default and this config gets re-applied via updateConfig on every
      // single ForceGraph construction, that's every node's pin getting
      // silently wiped on every reload, regardless of orphans — orphans just
      // made the resulting mess big enough and permanent enough (no further
      // correcting rebuild once the metadata cache had already settled) to
      // actually notice. Skipping the call entirely when nothing is really
      // changing (still off, or switching between two non-null modes is the
      // only remaining case that still needs it) sidesteps the bug instead
      // of trying to out-race it.
      if (!noDag || !wasNoDag) {
        // @ts-ignore
        this.instance.dagMode(noDag ? null : config?.display.dagOrientation).dagLevelDistance(75);
      }
      this.lastAppliedDagOrientation = dagOrientation;
    }

    /**
     * derive the need to reheat the simulation
     */
    const needReheat =
      config?.display?.nodeRepulsion !== undefined ||
      config?.display?.linkDistance !== undefined ||
      config?.display?.linkThickness !== undefined ||
      (config as LocalGraphSettings)?.display?.dagOrientation !== undefined;

    if (needReheat) {
      this.instance.numDimensions(3); // reheat simulation
      this.instance.refresh();
    }
  };
}
