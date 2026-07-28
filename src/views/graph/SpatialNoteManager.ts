import type { Node } from "@/graph/Node";
import { Component, MarkdownRenderer, setIcon, TFile, type App } from "obsidian";
import * as THREE from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

const NOTE_PANEL_CAMERA_OFFSET = 24;
const NOTE_PANEL_SCALE = 0.2;
const NOTE_PANEL_DEFAULT_WIDTH = 720;
const NOTE_PANEL_DEFAULT_HEIGHT = 520;
const NOTE_PANEL_MIN_WIDTH = 320;
const NOTE_PANEL_MIN_HEIGHT = 220;
const NOTE_PANEL_DEPTH_RENDER_ORDER = -10_000;
const NODE_CLICK_MOVE_THRESHOLD_PX = 5;
const PINNED_WAYPOINT_EDGE_MARGIN_PX = 34;

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type RenderedNode = Node &
  Partial<Coords> & {
    __threeObj?: THREE.Object3D;
  };

type PanelSide = {
  object: CSS3DObject;
  element: HTMLDivElement;
  contentElement: HTMLDivElement;
  component: Component;
  headerElement: HTMLDivElement;
  pinButtonElement: HTMLButtonElement;
};

type ExpandedNote = {
  node: RenderedNode;
  object: THREE.Group;
  sides: [PanelSide, PanelSide];
  nodeOffset: THREE.Vector3;
  depthMask: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  waypointElement: HTMLDivElement;
  widthPx: number;
  heightPx: number;
  pinned: boolean;
};

type PanelDragInteraction = {
  kind: "drag";
  note: ExpandedNote;
  plane: THREE.Plane;
  grabOffset: THREE.Vector3;
};

type PanelResizeInteraction = {
  kind: "resize";
  note: ExpandedNote;
  direction: ResizeDirection;
  startClientX: number;
  startClientY: number;
  startWidth: number;
  startHeight: number;
  startRectWidth: number;
  startRectHeight: number;
  startPosition: THREE.Vector3;
  sideObject: CSS3DObject;
};

type PanelInteraction = PanelDragInteraction | PanelResizeInteraction;

type PendingNodeClick = {
  node: RenderedNode;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
};

type SpatialNoteManagerOptions = {
  app: App;
  containerEl: HTMLDivElement;
  scene: THREE.Scene;
  camera: () => THREE.PerspectiveCamera;
  rendererCanvas: HTMLCanvasElement;
  nodes: () => RenderedNode[];
  onNodeHover: (node: RenderedNode | null) => void;
};

/**
 * Node-linked spatial note UI. Freecam hover and click share one raycast:
 * screen centre while pointer-locked, and the real cursor while unlocked.
 * Note content and Ink data stay in the node's real vault file.
 */
export class SpatialNoteManager {
  private readonly app: App;
  private readonly containerEl: HTMLDivElement;
  private readonly scene: THREE.Scene;
  private readonly getCamera: () => THREE.PerspectiveCamera;
  private readonly rendererCanvas: HTMLCanvasElement;
  private readonly getNodes: () => RenderedNode[];
  private readonly onNodeHover: (node: RenderedNode | null) => void;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointerClient = new THREE.Vector2();
  private readonly pointerNdc = new THREE.Vector2();
  private readonly raycastRoots: THREE.Object3D[] = [];
  private readonly visibleRaycastRoots: THREE.Object3D[] = [];
  private readonly raycastNodeByRoot = new Map<THREE.Object3D, RenderedNode>();
  private readonly panelDepthGeometry = new THREE.PlaneGeometry(1, 1);
  private readonly panelDepthMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.DoubleSide,
  });
  private readonly expandedNotes = new Map<string, ExpandedNote>();
  private readonly occludedNodePaths = new Set<string>();
  private readonly overlayRootEl: HTMLDivElement;
  private readonly hudEl: HTMLDivElement;
  private readonly statusEl: HTMLSpanElement;
  private readonly hoverLabelEl: HTMLDivElement;

  private freecamActive = false;
  private pointerLocked = false;
  private pointerLockFailed = false;
  private pointerInsideCanvas = false;
  private hoveredNode: RenderedNode | null = null;
  private panelInteraction: PanelInteraction | null = null;
  private pendingNodeClick: PendingNodeClick | null = null;
  private readonly originalCanvasPointerEvents: string;

  constructor(options: SpatialNoteManagerOptions) {
    this.app = options.app;
    this.containerEl = options.containerEl;
    this.scene = options.scene;
    this.getCamera = options.camera;
    this.rendererCanvas = options.rendererCanvas;
    this.originalCanvasPointerEvents = options.rendererCanvas.style.pointerEvents;
    this.getNodes = options.nodes;
    this.onNodeHover = options.onNodeHover;

    this.overlayRootEl = document.createElement("div");
    this.overlayRootEl.className = "spatial-note-overlay";

    this.hudEl = document.createElement("div");
    this.hudEl.className = "spatial-note-hud";
    this.hudEl.addEventListener("pointerdown", this.stopHudEvent);
    this.hudEl.addEventListener("click", this.stopHudEvent);

    this.statusEl = document.createElement("span");
    this.statusEl.className = "spatial-note-status";
    this.hudEl.appendChild(this.statusEl);

    this.hoverLabelEl = document.createElement("div");
    this.hoverLabelEl.className = "spatial-note-hover-label";
    this.hoverLabelEl.textContent = "Expand";

    this.overlayRootEl.append(this.hudEl, this.hoverLabelEl);
    this.containerEl.appendChild(this.overlayRootEl);

    this.rendererCanvas.addEventListener("pointerenter", this.onCanvasPointerEnter);
    this.rendererCanvas.addEventListener("pointermove", this.onCanvasPointerMove);
    this.rendererCanvas.addEventListener("pointerleave", this.onCanvasPointerLeave);
    this.rendererCanvas.addEventListener("pointerdown", this.onNodePointerDown, {
      capture: true,
    });
    document.addEventListener("pointermove", this.onDocumentPointerMove, { capture: true });
    document.addEventListener("pointerup", this.onDocumentPointerUp, { capture: true });
    document.addEventListener("pointercancel", this.onDocumentPointerUp, { capture: true });

    this.syncNodes();
    this.updateHud();
  }

  public get isInteracting(): boolean {
    if (this.panelInteraction || this.pendingNodeClick) return true;
    const activeElement = document.activeElement;
    return [...this.expandedNotes.values()].some(
      (note) =>
        note.sides.some((side) => side.element.matches(":hover")) ||
        (activeElement instanceof HTMLElement &&
          note.sides.some((side) => side.element.contains(activeElement)))
    );
  }

  public setFreecamState(active: boolean, pointerLocked = this.pointerLocked): void {
    this.freecamActive = active;
    this.pointerLocked = active && pointerLocked;
    this.pointerLockFailed = false;
    this.overlayRootEl.classList.toggle("is-pointer-locked", this.pointerLocked);
    if (this.pointerLocked) this.restoreCanvasPointerEvents();
    if (!active) {
      this.pendingNodeClick = null;
      this.setHoveredNode(null);
    }
    this.updateHud();
  }

  public setPointerLocked(pointerLocked: boolean): void {
    this.pointerLocked = this.freecamActive && pointerLocked;
    if (this.pointerLocked) this.pointerLockFailed = false;
    this.overlayRootEl.classList.toggle("is-pointer-locked", this.pointerLocked);
    if (this.pointerLocked) this.restoreCanvasPointerEvents();
    this.updateHud();
  }

  public setPointerLockFailed(failed: boolean): void {
    this.pointerLockFailed = this.freecamActive && failed;
    this.updateHud();
  }

  public syncNodes(): void {
    const nodes = this.getNodes();
    const nodesByPath = new Map(nodes.map((node) => [node.path, node]));
    this.raycastRoots.length = 0;
    this.raycastNodeByRoot.clear();

    for (const node of nodes) {
      const file = this.app.vault.getAbstractFileByPath(node.path);
      const root = node.__threeObj;
      if (!(file instanceof TFile) || file.extension !== "md" || !root) continue;
      this.raycastRoots.push(root);
      this.raycastNodeByRoot.set(root, node);
    }

    for (const [path, expanded] of this.expandedNotes) {
      const node = nodesByPath.get(path);
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!node || !(file instanceof TFile) || file.extension !== "md") {
        this.collapseNote(path);
      } else {
        expanded.node = node;
      }
    }
  }

  public update(camera: THREE.PerspectiveCamera): void {
    if (this.raycastRoots.length === 0) this.syncNodes();

    for (const expanded of this.expandedNotes.values()) {
      const nodePosition = this.getNodePosition(expanded.node, new THREE.Vector3());
      expanded.object.position.copy(nodePosition).add(expanded.nodeOffset);
      const visible = expanded.node.__threeObj?.visible !== false;
      expanded.object.visible = visible;
      expanded.depthMask.visible = visible;
      this.syncDepthMask(expanded);
      this.updatePinnedWaypoint(expanded, camera);
    }
    this.updateNodeLabelOcclusion(camera);

    if (!this.freecamActive || this.isInteracting) {
      this.setHoveredNode(null);
      return;
    }

    const node = this.raycastNode(camera);
    this.setHoveredNode(node);
    if (node) this.positionHoverLabel();
  }

  public isNodeLabelOccluded(node: RenderedNode): boolean {
    return this.occludedNodePaths.has(node.path);
  }

  public async toggleNode(node: RenderedNode): Promise<void> {
    const path = node.path;
    if (this.expandedNotes.has(path)) {
      this.collapseNote(path);
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile) || file.extension !== "md") return;

    if (document.pointerLockElement === this.rendererCanvas) document.exitPointerLock();

    const camera = this.getCamera();
    const nodePosition = this.getNodePosition(node, new THREE.Vector3());
    const towardCamera = camera.position.clone().sub(nodePosition);
    if (towardCamera.lengthSq() === 0) towardCamera.set(0, 0, 1);
    towardCamera.normalize().multiplyScalar(NOTE_PANEL_CAMERA_OFFSET);

    const frontSide = this.createPanelSide(file, path, "front");
    const backSide = this.createPanelSide(file, path, "back");
    backSide.object.rotation.y = Math.PI;

    const object = new THREE.Group();
    object.add(frontSide.object, backSide.object);
    object.position.copy(nodePosition).add(towardCamera);
    object.quaternion.copy(camera.quaternion);
    object.scale.setScalar(NOTE_PANEL_SCALE);
    object.name = `spatial-note-panel:${path}`;

    const depthMask = new THREE.Mesh(this.panelDepthGeometry, this.panelDepthMaterial);
    depthMask.name = `spatial-note-depth-mask:${path}`;
    depthMask.renderOrder = NOTE_PANEL_DEPTH_RENDER_ORDER;

    const waypointElement = document.createElement("div");
    waypointElement.className = "spatial-note-waypoint";
    waypointElement.setAttribute("aria-hidden", "true");
    waypointElement.title = file.basename;
    waypointElement.appendChild(document.createElement("span"));
    this.overlayRootEl.appendChild(waypointElement);

    const expanded: ExpandedNote = {
      node,
      object,
      sides: [frontSide, backSide],
      nodeOffset: towardCamera,
      depthMask,
      waypointElement,
      widthPx: NOTE_PANEL_DEFAULT_WIDTH,
      heightPx: NOTE_PANEL_DEFAULT_HEIGHT,
      pinned: false,
    };

    for (const side of expanded.sides) {
      side.headerElement.addEventListener("pointerdown", (event) => {
        if (event.target instanceof Element && event.target.closest("button")) return;
        this.beginPanelDrag(expanded, event);
      });
      side.pinButtonElement.addEventListener("click", () => this.togglePanelPin(expanded));

      const resizeDirections: ResizeDirection[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
      for (const direction of resizeDirections) {
        const handleEl = document.createElement("div");
        handleEl.className = `spatial-note-resize-handle is-${direction}`;
        handleEl.setAttribute("aria-hidden", "true");
        handleEl.addEventListener("pointerdown", (event) => {
          this.beginPanelResize(expanded, side, direction, event);
        });
        side.element.appendChild(handleEl);
      }
    }

    this.expandedNotes.set(path, expanded);
    this.syncDepthMask(expanded);
    this.scene.add(object, depthMask);
    this.hoverLabelEl.textContent = "Collapse";

    try {
      const markdown = await this.app.vault.cachedRead(file);
      if (this.expandedNotes.get(path) !== expanded) return;
      await Promise.all(
        expanded.sides.map(async (side) => {
          side.contentElement.replaceChildren();
          await MarkdownRenderer.render(
            this.app,
            markdown,
            side.contentElement,
            file.path,
            side.component
          );
        })
      );
      if (this.expandedNotes.get(path) !== expanded) {
        for (const side of expanded.sides) side.component.unload();
      }
    } catch (error) {
      if (this.expandedNotes.get(path) !== expanded) return;
      const message = `Could not render note: ${
        error instanceof Error ? error.message : String(error)
      }`;
      for (const side of expanded.sides) side.contentElement.textContent = message;
    }
  }

  private createPanelSide(file: TFile, path: string, sideName: "front" | "back"): PanelSide {
    const panelElement = document.createElement("div");
    panelElement.className = "spatial-note-panel";
    panelElement.dataset.spatialNotePath = path;
    panelElement.dataset.spatialNoteSide = sideName;
    panelElement.style.width = `${NOTE_PANEL_DEFAULT_WIDTH}px`;
    panelElement.style.height = `${NOTE_PANEL_DEFAULT_HEIGHT}px`;
    panelElement.style.pointerEvents = "auto";
    panelElement.addEventListener("pointerdown", (event) => event.stopPropagation());
    panelElement.addEventListener("pointerup", (event) => event.stopPropagation());
    panelElement.addEventListener("click", (event) => event.stopPropagation());
    panelElement.addEventListener("wheel", (event) => event.stopPropagation());

    const headerElement = document.createElement("div");
    headerElement.className = "spatial-note-panel-header";

    const titleElement = document.createElement("strong");
    titleElement.textContent = file.basename;
    headerElement.appendChild(titleElement);

    const headerControlsElement = document.createElement("div");
    headerControlsElement.className = "spatial-note-panel-controls";

    const pinButtonElement = document.createElement("button");
    pinButtonElement.type = "button";
    pinButtonElement.className = "clickable-icon spatial-note-pin-button";
    pinButtonElement.setAttribute("aria-label", "Pin spatial note panel");
    pinButtonElement.setAttribute("aria-pressed", "false");
    setIcon(pinButtonElement, "pin");
    headerControlsElement.appendChild(pinButtonElement);

    const closeButtonElement = document.createElement("button");
    closeButtonElement.type = "button";
    closeButtonElement.textContent = "Close";
    closeButtonElement.addEventListener("click", () => this.collapseNote(path));
    headerControlsElement.appendChild(closeButtonElement);
    headerElement.appendChild(headerControlsElement);
    panelElement.appendChild(headerElement);

    const contentElement = document.createElement("div");
    contentElement.className = "spatial-note-content markdown-preview-view markdown-rendered";
    contentElement.textContent = "Loading note...";
    panelElement.appendChild(contentElement);

    const object = new CSS3DObject(panelElement);
    object.name = `spatial-note-panel-${sideName}:${path}`;

    const component = new Component();
    component.load();

    return {
      object,
      element: panelElement,
      contentElement,
      component,
      headerElement,
      pinButtonElement,
    };
  }

  public destroy(): void {
    this.rendererCanvas.removeEventListener("pointerenter", this.onCanvasPointerEnter);
    this.rendererCanvas.removeEventListener("pointermove", this.onCanvasPointerMove);
    this.rendererCanvas.removeEventListener("pointerleave", this.onCanvasPointerLeave);
    this.rendererCanvas.removeEventListener("pointerdown", this.onNodePointerDown, {
      capture: true,
    });
    document.removeEventListener("pointermove", this.onDocumentPointerMove, {
      capture: true,
    });
    document.removeEventListener("pointerup", this.onDocumentPointerUp, {
      capture: true,
    });
    document.removeEventListener("pointercancel", this.onDocumentPointerUp, {
      capture: true,
    });

    this.panelInteraction = null;
    this.pendingNodeClick = null;
    this.restoreCanvasPointerEvents();
    this.setHoveredNode(null);
    for (const path of [...this.expandedNotes.keys()]) this.collapseNote(path);
    this.raycastRoots.length = 0;
    this.visibleRaycastRoots.length = 0;
    this.raycastNodeByRoot.clear();
    this.occludedNodePaths.clear();
    this.panelDepthGeometry.dispose();
    this.panelDepthMaterial.dispose();
    this.overlayRootEl.remove();
  }

  private stopHudEvent = (event: Event): void => {
    event.stopPropagation();
  };

  private updateHud(): void {
    this.hudEl.classList.toggle("is-freecam", this.freecamActive);
    if (!this.freecamActive) {
      this.statusEl.textContent = "F - Freecam";
    } else if (this.pointerLocked) {
      this.statusEl.textContent =
        "Freecam - WASD - Q/E roll - R level - P trail - Shift boost - Esc releases mouse";
    } else if (this.pointerLockFailed) {
      this.statusEl.textContent = "Freecam - pointer lock failed - click scene to retry";
    } else {
      this.statusEl.textContent =
        "Freecam - WASD - Q/E roll - R level - P trail - Shift boost - click scene for mouse look";
    }
  }

  private getNodePosition(node: RenderedNode, target: THREE.Vector3): THREE.Vector3 {
    if (node.__threeObj) {
      node.__threeObj.updateMatrixWorld();
      return node.__threeObj.getWorldPosition(target);
    }
    return target.set(node.x ?? 0, node.y ?? 0, node.z ?? 0);
  }

  private syncDepthMask(note: ExpandedNote): void {
    note.depthMask.position.copy(note.object.position);
    note.depthMask.quaternion.copy(note.object.quaternion);
    note.depthMask.scale.set(
      note.widthPx * Math.abs(note.object.scale.x),
      note.heightPx * Math.abs(note.object.scale.y),
      1
    );
    note.depthMask.updateMatrixWorld();
  }

  private updateNodeLabelOcclusion(camera: THREE.PerspectiveCamera): void {
    this.occludedNodePaths.clear();
    const masks = [...this.expandedNotes.values()]
      .map((note) => note.depthMask)
      .filter((mask) => mask.visible && this.isObjectTreeVisible(mask));
    if (masks.length === 0) return;

    camera.updateMatrixWorld();
    const cameraPosition = camera.getWorldPosition(new THREE.Vector3());
    const nodePosition = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const previousNear = this.raycaster.near;
    const previousFar = this.raycaster.far;

    for (const node of this.getNodes()) {
      if (!node.labelEl || !node.__threeObj || node.__threeObj.visible === false) continue;
      this.getNodePosition(node, nodePosition);
      direction.copy(nodePosition).sub(cameraPosition);
      const distance = direction.length();
      if (distance <= 0.001) continue;

      this.raycaster.set(cameraPosition, direction.multiplyScalar(1 / distance));
      this.raycaster.near = 0;
      this.raycaster.far = distance - 0.001;
      if (this.raycaster.intersectObjects(masks, false).length > 0) {
        this.occludedNodePaths.add(node.path);
      }
    }

    this.raycaster.near = previousNear;
    this.raycaster.far = previousFar;
  }

  private updatePinnedWaypoint(note: ExpandedNote, camera: THREE.PerspectiveCamera): void {
    if (!note.pinned || !note.object.visible) {
      note.waypointElement.classList.remove("is-visible");
      return;
    }

    camera.updateMatrixWorld();
    const worldPosition = note.object.getWorldPosition(new THREE.Vector3());
    const cameraPosition = worldPosition.clone().applyMatrix4(camera.matrixWorldInverse);
    const projected = worldPosition.clone().project(camera);
    const isInFront = cameraPosition.z < 0;
    const isInView =
      isInFront &&
      projected.z >= -1 &&
      projected.z <= 1 &&
      Math.abs(projected.x) <= 1 &&
      Math.abs(projected.y) <= 1;

    if (isInView) {
      note.waypointElement.classList.remove("is-visible");
      return;
    }

    const canvasRect = this.rendererCanvas.getBoundingClientRect();
    const containerRect = this.containerEl.getBoundingClientRect();
    if (canvasRect.width === 0 || canvasRect.height === 0) {
      note.waypointElement.classList.remove("is-visible");
      return;
    }

    let directionX = isInFront ? projected.x : cameraPosition.x;
    let directionY = isInFront ? -projected.y : -cameraPosition.y;
    if (
      !Number.isFinite(directionX) ||
      !Number.isFinite(directionY) ||
      Math.hypot(directionX, directionY) < 0.0001
    ) {
      directionX = 0;
      directionY = -1;
    }

    const halfWidth = Math.max(0, canvasRect.width / 2 - PINNED_WAYPOINT_EDGE_MARGIN_PX);
    const halfHeight = Math.max(0, canvasRect.height / 2 - PINNED_WAYPOINT_EDGE_MARGIN_PX);
    const edgeScale = Math.min(
      directionX === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(directionX),
      directionY === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(directionY)
    );
    const left =
      canvasRect.left - containerRect.left + canvasRect.width / 2 + directionX * edgeScale;
    const top = canvasRect.top - containerRect.top + canvasRect.height / 2 + directionY * edgeScale;
    const angle = Math.atan2(directionY, directionX) + Math.PI / 2;

    note.waypointElement.style.left = `${left}px`;
    note.waypointElement.style.top = `${top}px`;
    note.waypointElement.style.transform = `translate(-50%, -50%) rotate(${angle}rad)`;
    note.waypointElement.classList.add("is-visible");
  }

  private togglePanelPin(note: ExpandedNote): void {
    note.pinned = !note.pinned;
    for (const side of note.sides) {
      side.element.classList.toggle("is-pinned", note.pinned);
      side.pinButtonElement.classList.toggle("is-active", note.pinned);
      side.pinButtonElement.setAttribute("aria-pressed", `${note.pinned}`);
      side.pinButtonElement.setAttribute(
        "aria-label",
        note.pinned ? "Unpin spatial note panel" : "Pin spatial note panel"
      );
    }
    this.updatePinnedWaypoint(note, this.getCamera());
  }

  private beginPanelDrag(note: ExpandedNote, event: PointerEvent): void {
    if (event.button !== 0) return;

    const camera = this.getCamera();
    const dragPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(new THREE.Vector3()),
      note.object.position
    );
    const hit = this.intersectPointerPlane(event.clientX, event.clientY, dragPlane);
    if (!hit) return;

    this.panelInteraction = {
      kind: "drag",
      note,
      plane: dragPlane,
      grabOffset: hit.sub(note.object.position),
    };
    this.beginPanelInteraction(event);
  }

  private beginPanelResize(
    note: ExpandedNote,
    side: PanelSide,
    direction: ResizeDirection,
    event: PointerEvent
  ): void {
    if (event.button !== 0) return;

    const rect = side.element.getBoundingClientRect();
    this.panelInteraction = {
      kind: "resize",
      note,
      direction,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: note.widthPx,
      startHeight: note.heightPx,
      startRectWidth: Math.max(1, rect.width),
      startRectHeight: Math.max(1, rect.height),
      startPosition: note.object.position.clone(),
      sideObject: side.object,
    };
    this.beginPanelInteraction(event);
  }

  private beginPanelInteraction(event: PointerEvent): void {
    this.rendererCanvas.style.pointerEvents = "none";
    this.setHoveredNode(null);
    event.preventDefault();
    event.stopPropagation();
  }

  private onDocumentPointerMove = (event: PointerEvent): void => {
    const pendingNodeClick = this.pendingNodeClick;
    if (pendingNodeClick?.pointerId === event.pointerId) {
      const distance = Math.hypot(
        event.clientX - pendingNodeClick.startClientX,
        event.clientY - pendingNodeClick.startClientY
      );
      if (distance > NODE_CLICK_MOVE_THRESHOLD_PX) pendingNodeClick.moved = true;
    }

    const interaction = this.panelInteraction;
    if (!interaction) {
      this.routePointerEvents(event.clientX, event.clientY);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (interaction.kind === "drag") {
      const hit = this.intersectPointerPlane(event.clientX, event.clientY, interaction.plane);
      if (!hit) return;
      interaction.note.object.position.copy(hit.sub(interaction.grabOffset));
      this.updateNodeOffset(interaction.note);
      this.syncDepthMask(interaction.note);
      return;
    }

    this.resizePanel(interaction, event.clientX, event.clientY);
  };

  private onDocumentPointerUp = (event: PointerEvent): void => {
    const pendingNodeClick = this.pendingNodeClick;
    if (pendingNodeClick?.pointerId === event.pointerId) {
      this.pendingNodeClick = null;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type !== "pointercancel" && !pendingNodeClick.moved && this.freecamActive) {
        void this.toggleNode(pendingNodeClick.node);
      }
    }

    if (this.panelInteraction) {
      this.panelInteraction = null;
      this.routePointerEvents(event.clientX, event.clientY);
    }
  };

  private resizePanel(interaction: PanelResizeInteraction, clientX: number, clientY: number): void {
    const { note, direction } = interaction;
    const dx =
      (clientX - interaction.startClientX) * (interaction.startWidth / interaction.startRectWidth);
    const dy =
      (clientY - interaction.startClientY) *
      (interaction.startHeight / interaction.startRectHeight);

    let width = interaction.startWidth;
    let height = interaction.startHeight;
    if (direction.includes("e")) width = interaction.startWidth + dx;
    if (direction.includes("w")) width = interaction.startWidth - dx;
    if (direction.includes("s")) height = interaction.startHeight + dy;
    if (direction.includes("n")) height = interaction.startHeight - dy;
    width = Math.max(NOTE_PANEL_MIN_WIDTH, width);
    height = Math.max(NOTE_PANEL_MIN_HEIGHT, height);

    const widthDelta = width - interaction.startWidth;
    const heightDelta = height - interaction.startHeight;
    interaction.sideObject.updateMatrixWorld();
    const sideQuaternion = interaction.sideObject.getWorldQuaternion(new THREE.Quaternion());
    const localRight = new THREE.Vector3(1, 0, 0).applyQuaternion(sideQuaternion);
    const localUp = new THREE.Vector3(0, 1, 0).applyQuaternion(sideQuaternion);
    const horizontalShift = direction.includes("e")
      ? widthDelta / 2
      : direction.includes("w")
      ? -widthDelta / 2
      : 0;
    const verticalShift = direction.includes("n")
      ? heightDelta / 2
      : direction.includes("s")
      ? -heightDelta / 2
      : 0;

    note.widthPx = width;
    note.heightPx = height;
    for (const side of note.sides) {
      side.element.style.width = `${width}px`;
      side.element.style.height = `${height}px`;
    }
    note.object.position
      .copy(interaction.startPosition)
      .addScaledVector(localRight, horizontalShift * Math.abs(note.object.scale.x))
      .addScaledVector(localUp, verticalShift * Math.abs(note.object.scale.y));
    this.updateNodeOffset(note);
    this.syncDepthMask(note);
  }

  private updateNodeOffset(note: ExpandedNote): void {
    const nodePosition = this.getNodePosition(note.node, new THREE.Vector3());
    note.nodeOffset.copy(note.object.position).sub(nodePosition);
  }

  private intersectPointerPlane(
    clientX: number,
    clientY: number,
    plane: THREE.Plane
  ): THREE.Vector3 | null {
    const ndc = this.getClientNdc(clientX, clientY);
    if (!ndc) return null;
    const camera = this.getCamera();
    camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, camera);
    return this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  private getClientNdc(clientX: number, clientY: number): THREE.Vector2 | null {
    const rect = this.rendererCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    return this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1)
    );
  }

  private routePointerEvents(clientX: number, clientY: number): void {
    if (
      this.panelInteraction ||
      this.expandedNotes.size === 0 ||
      document.pointerLockElement === this.rendererCanvas
    ) {
      if (this.panelInteraction) this.rendererCanvas.style.pointerEvents = "none";
      else this.restoreCanvasPointerEvents();
      return;
    }

    this.rendererCanvas.style.pointerEvents = "none";
    const panelAtPointer = document
      .elementsFromPoint(clientX, clientY)
      .map((element) => element.closest<HTMLElement>(".spatial-note-panel"))
      .find((panel) => panel !== null && this.containerEl.contains(panel));
    const panelPath = panelAtPointer?.dataset.spatialNotePath;
    const panelNote = panelPath ? this.expandedNotes.get(panelPath) : undefined;
    const shouldRouteToPanel =
      panelNote !== undefined && this.isPanelUnoccludedAtPointer(panelNote, clientX, clientY);
    this.rendererCanvas.style.pointerEvents = shouldRouteToPanel
      ? "none"
      : this.originalCanvasPointerEvents;
  }

  private restoreCanvasPointerEvents(): void {
    this.rendererCanvas.style.pointerEvents = this.originalCanvasPointerEvents;
  }

  private isPanelUnoccludedAtPointer(
    note: ExpandedNote,
    clientX: number,
    clientY: number
  ): boolean {
    const ndc = this.getClientNdc(clientX, clientY);
    if (!ndc) return false;

    const camera = this.getCamera();
    camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    for (const hit of hits) {
      if (!this.isObjectTreeVisible(hit.object)) continue;
      if (hit.object === note.depthMask) return true;

      const material = (
        hit.object as THREE.Object3D & {
          material?: THREE.Material | THREE.Material[];
        }
      ).material;
      if (!material) continue;
      const materials = Array.isArray(material) ? material : [material];
      if (materials.some((entry) => entry.visible && entry.colorWrite)) return false;
    }
    return false;
  }

  private isObjectTreeVisible(object: THREE.Object3D): boolean {
    let current: THREE.Object3D | null = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  private raycastNode(camera: THREE.PerspectiveCamera): RenderedNode | null {
    const ndc = this.getPointerNdc();
    if (!ndc) return null;
    if (this.raycastRoots.length === 0 || this.raycastRoots.some((root) => root.parent === null)) {
      this.syncNodes();
    }

    this.visibleRaycastRoots.length = 0;
    for (const root of this.raycastRoots) {
      if (root.visible === false) continue;
      root.updateMatrixWorld();
      this.visibleRaycastRoots.push(root);
    }
    if (this.visibleRaycastRoots.length === 0) return null;

    camera.updateMatrixWorld();
    this.raycaster.setFromCamera(ndc, camera);
    for (const hit of this.raycaster.intersectObjects(this.visibleRaycastRoots, true)) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        const node = this.raycastNodeByRoot.get(object);
        if (node) return node;
        object = object.parent;
      }
    }
    return null;
  }

  private getPointerNdc(): THREE.Vector2 | null {
    if (this.pointerLocked && document.pointerLockElement === this.rendererCanvas) {
      return this.pointerNdc.set(0, 0);
    }
    if (!this.pointerInsideCanvas) return null;

    const rect = this.rendererCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const x = (this.pointerClient.x - rect.left) / rect.width;
    const y = (this.pointerClient.y - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return this.pointerNdc.set(x * 2 - 1, -(y * 2 - 1));
  }

  private positionHoverLabel(): void {
    const containerRect = this.containerEl.getBoundingClientRect();
    if (this.pointerLocked && document.pointerLockElement === this.rendererCanvas) {
      const canvasRect = this.rendererCanvas.getBoundingClientRect();
      this.hoverLabelEl.style.left = `${
        canvasRect.left - containerRect.left + canvasRect.width / 2
      }px`;
      this.hoverLabelEl.style.top = `${
        canvasRect.top - containerRect.top + canvasRect.height / 2
      }px`;
      return;
    }

    this.hoverLabelEl.style.left = `${this.pointerClient.x - containerRect.left}px`;
    this.hoverLabelEl.style.top = `${this.pointerClient.y - containerRect.top}px`;
  }

  private setHoveredNode(node: RenderedNode | null): void {
    if (this.hoveredNode !== node) {
      this.hoveredNode = node;
      this.onNodeHover(node);
    }
    this.hoverLabelEl.classList.toggle("is-visible", node !== null);
    if (node) {
      this.hoverLabelEl.textContent = this.expandedNotes.has(node.path) ? "Collapse" : "Expand";
    }
  }

  private onCanvasPointerEnter = (event: PointerEvent): void => {
    this.pointerInsideCanvas = true;
    this.pointerClient.set(event.clientX, event.clientY);
  };

  private onCanvasPointerMove = (event: PointerEvent): void => {
    this.pointerInsideCanvas = true;
    if (document.pointerLockElement !== this.rendererCanvas) {
      this.pointerClient.set(event.clientX, event.clientY);
    }
  };

  private onCanvasPointerLeave = (): void => {
    if (document.pointerLockElement === this.rendererCanvas) return;
    this.pointerInsideCanvas = false;
    this.setHoveredNode(null);
  };

  private onNodePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !this.freecamActive || this.isInteracting) return;

    this.pointerInsideCanvas = true;
    if (document.pointerLockElement !== this.rendererCanvas) {
      this.pointerClient.set(event.clientX, event.clientY);
    }

    // nodeThreeObject() builds its Three.js roots after the graph setter
    // returns. The constructor-time sync can therefore be empty on the first
    // session interaction; retry now, when the rendered roots are guaranteed
    // to be the source of truth.
    this.syncNodes();
    const node = this.raycastNode(this.getCamera());
    if (!node) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    this.pendingNodeClick = {
      node,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  };

  private collapseNote(path: string): void {
    const expanded = this.expandedNotes.get(path);
    if (!expanded) return;
    if (this.panelInteraction?.note === expanded) this.panelInteraction = null;
    this.expandedNotes.delete(path);
    this.scene.remove(expanded.object);
    this.scene.remove(expanded.depthMask);
    for (const side of expanded.sides) {
      side.component.unload();
      side.element.remove();
    }
    expanded.waypointElement.remove();
    if (this.hoveredNode?.path === path) this.hoverLabelEl.textContent = "Expand";
    this.restoreCanvasPointerEvents();
  }
}
