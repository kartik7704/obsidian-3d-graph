import * as TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { Node } from "@/graph/Node";
import type { BaseForceGraph } from "@/views/graph/ForceGraph";
import type { Link } from "@/graph/Link";
import { CommandModal } from "@/commands/CommandModal";
import { CommandClickNodeAction, FreecamCursorReleaseInput, GraphType } from "@/SettingsSchemas";
import { createNotice } from "@/util/createNotice";
import { hexToRGBA } from "@/util/hexToRGBA";
import type { TFile } from "obsidian";

const cameraLookAtCenterTransitionDuration = 1000;
const LINK_PARTICLE_MULTIPLIER = 2;
export const FOCAL_FROM_CAMERA = 400;
const selectedColor = "#CCA700";
const PARTICLE_FREQUECY = 4;
const LINK_ARROW_WIDTH_MULTIPLIER = 5;
const FREECAM_ACCELERATION = 1080;
const FREECAM_FRICTION = 6;
const FREECAM_SPEED_MULTIPLIER = 4;
const FREECAM_MOUSE_SENSITIVITY = 0.002;
const FREECAM_ROLL_SPEED = Math.PI / 2;
const FREECAM_LEVEL_DURATION_MS = 350;
export const FREECAM_TRAIL_MAX_POINTS = 240;
const FREECAM_TRAIL_SAMPLE_DISTANCE = 6;
export const FREECAM_TRAIL_DURATION_MS = 5_000;

type TimedTrailPoint = {
  position: THREE.Vector3;
  sampledAt: number;
};

/**
 * this instance handle all the interaction. In other words, the interaction manager
 */
export class ForceGraphEngine {
  private forceGraph: BaseForceGraph;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tween: { [tweenId: string]: TWEEN.Tween<any> | undefined } = {};
  private spaceDown = false;
  private commandDown = false;
  private selectedNodes = new Set<Node>();
  /**
   * the node connected to the hover node
   */
  public readonly highlightedNodes: Set<string> = new Set();
  /**
   * the links connected to the hover node
   */
  public readonly highlightedLinks: Set<Link> = new Set();
  hoveredNode: Node | null = null;

  // zooming
  private isZooming = false;
  private startZoomTimeout: Timer | undefined;
  private endZoomTimeout: Timer | undefined;

  // freecam
  private freecamActive = false;
  private rendererDomEl: HTMLCanvasElement | null = null;
  private readonly pressedFreecamKeys = new Set<string>();
  private readonly freecamPosition = new THREE.Vector3();
  private readonly freecamDirection = new THREE.Quaternion();
  private readonly freecamUp = new THREE.Vector3(0, 1, 0);
  private readonly freecamVelocity = new THREE.Vector3();
  private readonly freecamMouseEuler = new THREE.Euler(0, 0, 0, "YXZ");
  private readonly freecamMouseRotation = new THREE.Quaternion();
  private readonly freecamRollRotation = new THREE.Quaternion();
  private readonly freecamLevelStart = new THREE.Quaternion();
  private readonly freecamLevelTarget = new THREE.Quaternion();
  private freecamLevelStartTime: number | null = null;
  private readonly freecamTrailPoints: TimedTrailPoint[] = [];
  private freecamTrailLine: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial> | null =
    null;
  private freecamTrailVisible = false;
  private freecamSpeedBoost = false;
  private freecamLastFrameTime = performance.now();
  private controlsWereEnabled = true;
  private freecamKeyListenersAttached = false;
  private pointerLockVerificationTimer: number | undefined;

  constructor(forceGraph: BaseForceGraph) {
    this.forceGraph = forceGraph;
    this.initListeners();
  }

  onZoom(event: WheelEvent) {
    const camera = this.forceGraph.instance.camera() as THREE.PerspectiveCamera;
    // check if it is start zooming using setTimeout
    // if it is, then cancel the animation
    if (!this.isZooming && !this.startZoomTimeout) {
      this.startZoomTimeout = setTimeout(() => {
        // console.log("this should only show once");
        if (!this.isZooming) {
          clearTimeout(this.startZoomTimeout);
          this.startZoomTimeout = undefined;
          this.isZooming = true;
          this.onZoomStart();
        }
        return;
      }, 100);
    }

    camera.updateProjectionMatrix();

    if (this.isZooming) {
      clearTimeout(this.endZoomTimeout);
      this.endZoomTimeout = setTimeout(() => {
        this.endZoomTimeout = undefined;
        this.isZooming = false;
        this.onZoomEnd();
      }, 100);
    }
  }

  private onZoomEnd() {}

  private onZoomStart = () => {
    const tweens = Object.keys(this.tween);
    if (tweens) {
      Object.values(this.tween).forEach((tween) => {
        if (tween) {
          tween.stop();
        }
      });
      // remove the tween
      this.tween = {};
    }
  };

  onNodeDrag = (node: Node & Coords, translate: Coords) => {
    // https://github.com/vasturiano/3d-force-graph/issues/279#issuecomment-587135032
    if (this.forceGraph.view.settingManager.getCurrentSetting().display.dontMoveWhenDrag)
      this.forceGraph.instance.cooldownTicks(0);
    if (this.selectedNodes.has(node)) {
      // moving a selected node
      [...this.selectedNodes]
        .filter((selNode) => selNode !== node) // don't touch node being dragged
        .forEach((node) =>
          ["x", "y", "z"].forEach(
            // @ts-ignore
            (coord) => (node[`f${coord}`] = node[coord] + translate[coord])
          )
        ); // translate other nodes by same amount
    }

    // if this is a ring node, keep orbiting children snapped to it in real time (not just on drag end)
    const ringManager = this.forceGraph.view.plugin.ringManager;
    if (ringManager.isRing(node.path)) {
      this.forceGraph.updateRingMeshPositions();
      const ring = ringManager.getRing(node.path)!;
      const childPositions = ringManager.snapRing(
        ring,
        { x: node.x, y: node.y, z: node.z },
        { persist: "none" }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.forceGraph.instance.graphData().nodes as any[]).forEach((n: any) => {
        const pos = childPositions[n.path];
        if (pos) {
          n.x = pos.x;
          n.y = pos.y;
          n.z = pos.z;
          n.fx = pos.x;
          n.fy = pos.y;
          n.fz = pos.z;
        }
      });
    }
  };

  onNodeDragEnd = (node: Node & Coords) => {
    const setting = this.forceGraph.view.settingManager.getCurrentSetting();
    // https://github.com/vasturiano/3d-force-graph/issues/279#issuecomment-587135032
    if (setting.display.dontMoveWhenDrag) this.forceGraph.instance.cooldownTicks(Infinity);
    if (this.selectedNodes.has(node)) {
      // finished moving a selected node
      [...this.selectedNodes]
        .filter((selNode) => selNode !== node) // don't touch node being dragged
        // @ts-ignore
        .forEach((node) => ["x", "y", "z"].forEach((coord) => (node[`f${coord}`] = undefined))); // unfix controlled nodes
    }

    // save this node's position so it's restored on next graph open
    const posManager = this.forceGraph.view.plugin.nodePositionManager;
    posManager.setPosition(node.path, node.x, node.y, node.z);
    posManager.saveDebounced();
    if (setting.display.saveCoordinatesToFrontmatter && setting.display.dontMoveWhenDrag) {
      posManager.writeFrontmatter(node.path, node.x, node.y, node.z);
    }

    // if this is a ring node, move the torus and re-snap children
    const ringManager = this.forceGraph.view.plugin.ringManager;
    if (ringManager.isRing(node.path)) {
      this.forceGraph.updateRingMeshPositions();
      const ring = ringManager.getRing(node.path)!;
      const shouldWriteFrontmatter =
        setting.display.saveCoordinatesToFrontmatter && setting.display.dontMoveWhenDrag;
      const childPositions = ringManager.snapRing(
        ring,
        { x: node.x, y: node.y, z: node.z },
        { persist: shouldWriteFrontmatter ? "frontmatter" : "positions" }
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.forceGraph.instance.graphData().nodes as any[]).forEach((n: any) => {
        const pos = childPositions[n.path];
        if (pos) {
          n.x = pos.x;
          n.y = pos.y;
          n.z = pos.z;
          n.fx = pos.x;
          n.fy = pos.y;
          n.fz = pos.z;
        }
      });
      this.forceGraph.instance.numDimensions(3);
      // Same gap as applyLivePositions/onHandleMouseUp: once the simulation
      // has settled (dontMoveWhenDrag pins nodes via fx/fy/fz, so there's
      // nothing left for the physics engine to animate), the renderer stops
      // redrawing on its own. Direct mutations after that point — the ring
      // torus's mesh.position.set() in updateRingMeshPositions, or the
      // children's node.x/y/z above — don't appear until something else
      // forces a render. That's why "show rings" looked stuck at the
      // pre-drag position until an unrelated click or hover kicked a redraw.
      // .refresh() forces that render immediately instead of waiting.
      this.forceGraph.instance.refresh();
    }
  };

  onNodeRightClick = (node: Node & Coords, event: MouseEvent) => {
    const plugin = this.forceGraph.view.plugin;
    const pluginSetting = plugin.settingManager.getSettings().pluginSetting;
    if (this.commandDown || event.ctrlKey) {
      const clickedNodeFile = this.findFileByNode(node);
      if (
        pluginSetting.commandRightClickNode === CommandClickNodeAction.openNodeInNewTab &&
        clickedNodeFile
      ) {
        // open file in new tab
        this.openFileInNewTab(clickedNodeFile);
      } else if (pluginSetting.commandRightClickNode === CommandClickNodeAction.focusNode)
        this.focusOnCoords(node);
      return;
    }

    // open context menu
    if (!this.selectedNodes.has(node)) {
      this.selectedNodes.clear();
      this.selectedNodes.add(node);
    }
    //   show a modal
    const modal = new CommandModal(this.forceGraph.view, this.selectedNodes);
    const promptEl = modal.containerEl.querySelector(".prompt");
    const dv = promptEl?.createDiv({
      text: `Commands will be run for ${this.selectedNodes.size} nodes.`,
    });
    dv?.setAttribute("style", "padding: var(--size-4-3); font-size: var(--font-smaller);");
    modal.open();
  };

  onNodeClick = (node: Node & Coords, event: MouseEvent) => {
    if (this.freecamActive) {
      void this.forceGraph.spatialNotes.toggleNode(node);
      return;
    }

    const plugin = this.forceGraph.view.plugin;
    const pluginSetting = plugin.settingManager.getSettings().pluginSetting;
    if (event.shiftKey) {
      const isSelected = this.selectedNodes.has(node);
      // multi-selection
      isSelected ? this.selectedNodes.delete(node) : this.selectedNodes.add(node);
      return;
    }
    const clickedNodeFile = this.findFileByNode(node);

    if (this.commandDown || event.ctrlKey) {
      if (
        pluginSetting.commandLeftClickNode === CommandClickNodeAction.openNodeInNewTab &&
        clickedNodeFile
      ) {
        // open file in new tab
        this.openFileInNewTab(clickedNodeFile);
      } else if (pluginSetting.commandLeftClickNode === CommandClickNodeAction.focusNode)
        this.focusOnCoords(node);
      return;
    }

    if (clickedNodeFile) {
      if (this.forceGraph.view.graphType === GraphType.local) {
        // open file in new tab
        this.openFileInNewTab(clickedNodeFile);
      } else {
        // open file in current tab (active leaf)
        this.forceGraph.view.itemView.leaf.openFile(clickedNodeFile);
      }
    }
  };

  onNodeHover = (node: Node | null) => {
    if (this.freecamActive) return;
    this.applyNodeHover(node, true);
  };

  public onSpatialNoteHover = (node: Node | null) => {
    this.applyNodeHover(node, false);
  };

  private applyNodeHover(node: Node | null, allowPagePreview: boolean): void {
    if ((!node && !this.highlightedNodes.size) || (node && this.hoveredNode === node)) return;

    // set node label text
    if (node) {
      const text = this.getNodeLabelText(node);
      this.forceGraph.nodeLabelEl.textContent = text;
      // @ts-ignore
      this.forceGraph.nodeLabelEl.style.color = node.color;
      this.forceGraph.nodeLabelEl.style.opacity = "1";
    } else {
      this.forceGraph.nodeLabelEl.style.opacity = "0";
    }

    this.clearHighlights();

    // add the new highlighted nodes and link
    if (node) {
      this.highlightedNodes.add(node.id);
      node.neighbors.forEach((neighbor) => this.highlightedNodes.add(neighbor.id));
      const nodeLinks = this.forceGraph.instance.graphData().getLinksWithNode(node.id);
      if (nodeLinks) nodeLinks.forEach((link) => this.highlightedLinks.add(link));
    }

    const shouldUseCommand =
      this.forceGraph.view.plugin.app.internalPlugins.getPluginById("page-preview")?.instance
        ?.overrides?.["3d-graph"] !== false;
    // show the hover preview
    if (
      allowPagePreview &&
      node &&
      node.labelEl &&
      ((shouldUseCommand && this.commandDown) || !shouldUseCommand)
    ) {
      this.forceGraph.view.hoverPopover?.hide();
      this.forceGraph.view.eventBus.trigger("open-node-preview", node);
    }

    this.hoveredNode = node ?? null;
    this.updateColor();
  }

  /**
   * when hover on node or link, they are highlighted. This function will clear the highlight
   */
  private clearHighlights = () => {
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
  };

  updateNodeLabelDiv() {
    this.forceGraph.instance.nodeThreeObject(this.forceGraph.instance.nodeThreeObject());
    this.forceGraph.spatialNotes.syncNodes();
  }

  /**
   * this will update the color of the nodes and links
   */
  updateColor() {
    // trigger update of highlighted objects in scene
    this.forceGraph.instance
      .nodeColor(this.forceGraph.instance.nodeColor())
      .linkColor(this.forceGraph.instance.linkColor())
      .linkDirectionalParticles(this.forceGraph.instance.linkDirectionalParticles());
  }

  getLinkColor = (link: Link) => {
    const color = this.isHighlightedLink(link)
      ? this.forceGraph.view.settingManager.getCurrentSetting().display.linkHoverColor
      : this.forceGraph.view.theme.graphLine;
    return hexToRGBA(color, this.getIsAnyHighlighted() && !this.isHighlightedLink(link) ? 0.2 : 1);
  };

  getLinkWidth = (link: Link) => {
    const setting = this.forceGraph.view.settingManager.getCurrentSetting();
    return this.isHighlightedLink(link)
      ? setting.display.linkThickness * 1.5
      : setting.display.linkThickness;
  };

  getLinkDirectionalParticles = (link: Link) => {
    return this.isHighlightedLink(link) ? PARTICLE_FREQUECY : 0;
  };

  getLinkDirectionalParticleWidth = () => {
    const setting = this.forceGraph.view.settingManager.getCurrentSetting();
    return setting.display.linkThickness * LINK_PARTICLE_MULTIPLIER;
  };

  onLinkHover = (link: Link | null) => {
    this.clearHighlights();

    if (link) {
      this.highlightedLinks.add(link);
      this.highlightedNodes.add(link.source.id);
      this.highlightedNodes.add(link.target.id);
    }
    this.updateColor();
  };

  findFileByNode = (node: Node): TFile | undefined => {
    // O(1) map lookup, not a full-vault scan on every click/right-click —
    // same pattern already used throughout NodePositionManager.
    return (
      (this.forceGraph.view.plugin.app.vault.getAbstractFileByPath(node.path) as TFile | null) ??
      undefined
    );
  };

  public getNodeOpacityEasedValue = (node: Node) => {
    // get the position of the node
    // @ts-ignore
    const obj = node.__threeObj as THREE.Object3D | undefined;
    if (!obj) return 0;
    const nodePosition = obj.position;
    // then get the distance between the node and this.myCube , console.log it
    const distance = nodePosition.distanceTo(this.forceGraph.myCube.position);
    // change the opacity of the nodeEl base on the distance
    // the higher the distance, the lower the opacity
    // when the distance is 300, the opacity is 0
    const distanceFromFocal =
      this.forceGraph.view.settingManager.getCurrentSetting().display.distanceFromFocal;
    const normalizedDistance = Math.min(distance, distanceFromFocal) / distanceFromFocal;
    const easedValue = 0.5 - 0.5 * Math.cos(normalizedDistance * Math.PI);
    return easedValue;
  };

  getLinkDirectionalArrowLength = () => {
    const settings = this.forceGraph.view.settingManager.getCurrentSetting();

    return (
      settings.display.linkThickness *
      LINK_ARROW_WIDTH_MULTIPLIER *
      (settings.display.showLinkArrow ? 1 : 0)
    );
  };

  private isHighlightedLink = (link: Link): boolean => {
    return this.highlightedLinks.has(link);
  };

  public getNodeLabelText = (node: Node) => {
    const settings = this.forceGraph.view.settingManager.getCurrentSetting();
    const fullPath = node.path;
    const fileNameWithExtension = node.name;
    const ext = fileNameWithExtension.substring(fileNameWithExtension.lastIndexOf("."));
    const fullPathWithoutExtension = fullPath.substring(0, fullPath.lastIndexOf("."));
    const fileNameWithoutExtension = fileNameWithExtension.substring(
      0,
      fileNameWithExtension.lastIndexOf(".")
    );
    // match native Obsidian behavior: never show .md even when showExtension is on
    const showExt = settings.display.showExtension && ext !== ".md";
    const text = !showExt
      ? settings.display.showFullPath
        ? fullPathWithoutExtension
        : fileNameWithoutExtension
      : settings.display.showFullPath
      ? fullPath
      : fileNameWithExtension;
    return text;
  };

  // Bound instance methods, not anonymous closures, so destroy() below can
  // actually unregister them — an anonymous listener passed straight to
  // addEventListener has no reference to remove later.
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.spaceDown = true;
      // this.controls.mouseButtons.LEFT = THREE.MOUSE.RIGHT;
    }
    if (e.metaKey) this.commandDown = true;

    if (
      e.code === "KeyF" &&
      !e.repeat &&
      !this.isTextEntryTarget(e.target) &&
      this.isGraphInputActive()
    ) {
      this.setFreecamActive(!this.freecamActive);
      e.preventDefault();
      return;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "Space") {
      this.spaceDown = false;
      // this.controls.mouseButtons.LEFT = THREE.MOUSE.LEFT;
    }
    if (!e.metaKey) this.commandDown = false;
  };

  private onFreecamKeyDown = (event: KeyboardEvent): void => {
    if (
      this.isTextEntryTarget(event.target) ||
      !this.isFreecamInputActive() ||
      ![
        "KeyW",
        "KeyA",
        "KeyS",
        "KeyD",
        "KeyQ",
        "KeyE",
        "KeyR",
        "KeyP",
        "ShiftLeft",
        "ShiftRight",
      ].includes(event.code)
    )
      return;

    this.freecamSpeedBoost = event.shiftKey;
    if (event.code.startsWith("Shift")) {
      this.freecamSpeedBoost = true;
    } else if (event.code === "KeyR") {
      if (!event.repeat) this.levelFreecam();
    } else if (event.code === "KeyP") {
      if (!event.repeat) this.toggleFreecamTrail();
    } else {
      this.pressedFreecamKeys.add(event.code);
    }
    event.preventDefault();
  };

  private onFreecamKeyUp = (event: KeyboardEvent): void => {
    if (event.code.startsWith("Shift")) {
      this.freecamSpeedBoost = event.shiftKey;
      return;
    }
    if (!["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE"].includes(event.code)) return;
    this.pressedFreecamKeys.delete(event.code);
    event.preventDefault();
  };

  initListeners() {
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onFreecamMouseMove);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    document.addEventListener("pointerlockerror", this.onPointerLockError);
    window.addEventListener("blur", this.onWindowBlur);
  }

  /**
   * The force-graph instance does not exist yet when ForceGraphEngine is
   * constructed, so the renderer-specific freecam hooks are attached once
   * ForceGraph has created its canvas.
   */
  public bindRenderer(rendererDomEl: HTMLCanvasElement): void {
    this.rendererDomEl = rendererDomEl;
    rendererDomEl.tabIndex = 0;
    rendererDomEl.addEventListener("pointerdown", this.onFreecamPointerDown);
    rendererDomEl.addEventListener("contextmenu", this.onFreecamContextMenu);

    // TrackballControls reserves A/S/D as drag-mode modifiers at the window
    // level. That binding is the source of the normal-camera WASD fling when
    // a mouse button is held, so leave those keys exclusively to freecam.
    const trackballKeys = (
      this.forceGraph.instance.controls() as unknown as {
        keys?: unknown;
      }
    ).keys;
    if (Array.isArray(trackballKeys)) trackballKeys.length = 0;

    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.Float32BufferAttribute([], 3));
    trailGeometry.setAttribute("trailAlpha", new THREE.Float32BufferAttribute([], 1));
    const trailMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      uniforms: {
        trailColor: { value: new THREE.Color(0x8f6ad8) },
        trailOpacity: { value: 0.42 },
      },
      vertexShader: `
        attribute float trailAlpha;
        varying float vTrailAlpha;

        void main() {
          vTrailAlpha = trailAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 trailColor;
        uniform float trailOpacity;
        varying float vTrailAlpha;

        void main() {
          gl_FragColor = vec4(trailColor, trailOpacity * vTrailAlpha);
        }
      `,
    });
    this.freecamTrailLine = new THREE.LineSegments(trailGeometry, trailMaterial);
    this.freecamTrailLine.name = "freecam-flight-trail";
    this.freecamTrailLine.frustumCulled = false;
    this.freecamTrailLine.renderOrder = 10_000;
    this.freecamTrailLine.visible = false;
    this.forceGraph.instance.scene().add(this.freecamTrailLine);
  }

  public updateFreecam(): void {
    const now = performance.now();
    const deltaSeconds = Math.min((now - this.freecamLastFrameTime) / 1000, 0.05);
    this.freecamLastFrameTime = now;

    if (!this.freecamActive) {
      this.updateFreecamTrail(now);
      return;
    }
    const camera = this.forceGraph.instance.camera() as THREE.PerspectiveCamera;
    const localMovement = new THREE.Vector3();
    const rollDirection =
      Number(this.pressedFreecamKeys.has("KeyQ")) - Number(this.pressedFreecamKeys.has("KeyE"));

    if (rollDirection !== 0 && this.isFreecamInputActive()) {
      this.freecamLevelStartTime = null;
      // Local +Z is collinear with the view axis; this sign convention makes
      // Q roll the screen left and E roll it right.
      this.freecamRollRotation.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        rollDirection * FREECAM_ROLL_SPEED * deltaSeconds
      );
      this.freecamDirection.multiply(this.freecamRollRotation).normalize();
      this.updateFreecamUp();
    } else {
      this.updateFreecamLevel(now);
    }

    if (this.isFreecamInputActive()) {
      // This deliberately mirrors player-controls.js: build movement in
      // camera-local space, rotate it by the independently-owned freecam
      // quaternion, then integrate velocity/position. No OrbitControls
      // target or focused graph node participates in this calculation.
      if (this.pressedFreecamKeys.has("KeyW")) localMovement.z -= 1;
      if (this.pressedFreecamKeys.has("KeyS")) localMovement.z += 1;
      if (this.pressedFreecamKeys.has("KeyD")) localMovement.x += 1;
      if (this.pressedFreecamKeys.has("KeyA")) localMovement.x -= 1;
    }

    this.freecamVelocity.multiplyScalar(Math.exp(-FREECAM_FRICTION * deltaSeconds));
    if (this.freecamVelocity.lengthSq() < 0.0001) this.freecamVelocity.set(0, 0, 0);

    if (localMovement.lengthSq() > 0) {
      localMovement
        .applyQuaternion(this.freecamDirection)
        .multiplyScalar(
          FREECAM_ACCELERATION *
            (this.freecamSpeedBoost ? FREECAM_SPEED_MULTIPLIER : 1) *
            deltaSeconds
        );
      this.freecamVelocity.add(localMovement);
    }

    this.freecamPosition.addScaledVector(this.freecamVelocity, deltaSeconds);

    // three-render-objects still calls its OrbitControls.update() every tick,
    // even while controls.enabled is false. Reapplying this independent pose
    // in Scene.onBeforeRender is what makes the freecam genuinely untethered.
    camera.position.copy(this.freecamPosition);
    camera.quaternion.copy(this.freecamDirection);
    camera.updateMatrixWorld();
    this.sampleFreecamTrail(now);
    this.updateFreecamTrail(now);
  }

  // Every ForceGraphEngine construction (each new ForceGraph, e.g.
  // refreshGraph's rebuild) registered another pair of document-level
  // listeners with nothing ever removing the old pair — called from
  // refreshGraph alongside the three-forcegraph instance's own _destructor().
  public destroy(): void {
    this.setFreecamActive(false);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onFreecamMouseMove);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("pointerlockerror", this.onPointerLockError);
    window.removeEventListener("blur", this.onWindowBlur);
    this.rendererDomEl?.removeEventListener("pointerdown", this.onFreecamPointerDown);
    this.rendererDomEl?.removeEventListener("contextmenu", this.onFreecamContextMenu);
    this.rendererDomEl = null;
    this.detachFreecamKeyListeners();
    this.clearPointerLockVerification();
    this.pressedFreecamKeys.clear();
    this.freecamVelocity.set(0, 0, 0);
    if (this.freecamTrailLine) {
      this.forceGraph.instance.scene().remove(this.freecamTrailLine);
      this.freecamTrailLine.geometry.dispose();
      this.freecamTrailLine.material.dispose();
      this.freecamTrailLine = null;
    }
    this.freecamTrailPoints.length = 0;
  }

  private updateFreecamUp(): void {
    this.freecamUp.set(0, 1, 0).applyQuaternion(this.freecamDirection).normalize();
  }

  private levelFreecam(): void {
    const horizontalForward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.freecamDirection)
      .setY(0);
    if (horizontalForward.lengthSq() < 0.000001) horizontalForward.set(0, 0, -1);
    horizontalForward.normalize();

    const lookMatrix = new THREE.Matrix4().lookAt(
      new THREE.Vector3(),
      horizontalForward,
      new THREE.Vector3(0, 1, 0)
    );
    this.freecamLevelStart.copy(this.freecamDirection);
    this.freecamLevelTarget.setFromRotationMatrix(lookMatrix).normalize();
    this.freecamLevelStartTime = performance.now();
  }

  private updateFreecamLevel(now: number): void {
    if (this.freecamLevelStartTime === null) return;
    const progress = Math.clamp(
      (now - this.freecamLevelStartTime) / FREECAM_LEVEL_DURATION_MS,
      0,
      1
    );
    const easedProgress = progress * progress * (3 - 2 * progress);
    this.freecamDirection
      .slerpQuaternions(this.freecamLevelStart, this.freecamLevelTarget, easedProgress)
      .normalize();
    this.updateFreecamUp();
    if (progress === 1) this.freecamLevelStartTime = null;
  }

  private toggleFreecamTrail(): void {
    this.freecamTrailVisible = !this.freecamTrailVisible;
    this.updateFreecamTrail(performance.now());
  }

  private sampleFreecamTrail(now: number): void {
    const lastPoint = this.freecamTrailPoints.at(-1);
    if (
      lastPoint &&
      lastPoint.position.distanceToSquared(this.freecamPosition) <
        FREECAM_TRAIL_SAMPLE_DISTANCE * FREECAM_TRAIL_SAMPLE_DISTANCE
    )
      return;

    this.freecamTrailPoints.push({
      position: this.freecamPosition.clone(),
      sampledAt: now,
    });
    if (this.freecamTrailPoints.length > FREECAM_TRAIL_MAX_POINTS) {
      this.freecamTrailPoints.splice(0, this.freecamTrailPoints.length - FREECAM_TRAIL_MAX_POINTS);
    }
  }

  private updateFreecamTrail(now: number): void {
    while (
      this.freecamTrailPoints.length > 0 &&
      now - this.freecamTrailPoints[0]!.sampledAt >= FREECAM_TRAIL_DURATION_MS
    ) {
      this.freecamTrailPoints.shift();
    }
    if (!this.freecamTrailLine) return;

    const positions: number[] = [];
    const alphas: number[] = [];
    for (let index = 1; index < this.freecamTrailPoints.length; index++) {
      const start = this.freecamTrailPoints[index - 1]!;
      const end = this.freecamTrailPoints[index]!;
      positions.push(
        start.position.x,
        start.position.y,
        start.position.z,
        end.position.x,
        end.position.y,
        end.position.z
      );
      alphas.push(
        this.getTrailPointAlpha(start.sampledAt, now),
        this.getTrailPointAlpha(end.sampledAt, now)
      );
    }

    this.freecamTrailLine.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    this.freecamTrailLine.geometry.setAttribute(
      "trailAlpha",
      new THREE.Float32BufferAttribute(alphas, 1)
    );
    this.freecamTrailLine.visible = this.freecamTrailVisible && positions.length > 0;
  }

  private getTrailPointAlpha(sampledAt: number, now: number): number {
    const remaining = Math.clamp(1 - (now - sampledAt) / FREECAM_TRAIL_DURATION_MS, 0, 1);
    return remaining * remaining;
  }

  private attachFreecamKeyListeners(): void {
    if (this.freecamKeyListenersAttached) return;
    document.addEventListener("keydown", this.onFreecamKeyDown);
    document.addEventListener("keyup", this.onFreecamKeyUp);
    this.freecamKeyListenersAttached = true;
  }

  private detachFreecamKeyListeners(): void {
    if (!this.freecamKeyListenersAttached) return;
    document.removeEventListener("keydown", this.onFreecamKeyDown);
    document.removeEventListener("keyup", this.onFreecamKeyUp);
    this.freecamKeyListenersAttached = false;
  }

  private isTextEntryTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    );
  }

  private isGraphInputActive(): boolean {
    if (!this.rendererDomEl) return false;
    return (
      document.pointerLockElement === this.rendererDomEl ||
      this.forceGraph.view.contentEl.matches(":hover") ||
      this.forceGraph.view.contentEl.contains(document.activeElement)
    );
  }

  private isFreecamInputActive(): boolean {
    return (
      !this.forceGraph.spatialNotes.isInteracting &&
      (document.pointerLockElement === this.rendererDomEl ||
        this.forceGraph.view.contentEl.matches(":hover"))
    );
  }

  private setFreecamActive(active: boolean): void {
    if (this.freecamActive === active) return;

    const camera = this.forceGraph.instance.camera() as THREE.PerspectiveCamera;
    const controls = this.forceGraph.instance.controls() as OrbitControls;
    this.pressedFreecamKeys.clear();
    this.freecamSpeedBoost = false;
    this.freecamLevelStartTime = null;
    this.freecamLastFrameTime = performance.now();

    if (active) {
      this.onZoomStart();
      this.controlsWereEnabled = controls.enabled;

      // The visible camera pose is the source of truth on every activation.
      // In particular, do this after any orbit/trackball session instead of
      // reusing the quaternion left behind by the previous freecam session.
      camera.updateMatrixWorld();
      this.freecamPosition.copy(camera.position);
      this.freecamDirection.copy(camera.quaternion).normalize();
      this.updateFreecamUp();
      this.freecamVelocity.set(0, 0, 0);
      this.freecamTrailPoints.length = 0;
      this.sampleFreecamTrail(this.freecamLastFrameTime);
      this.updateFreecamTrail(this.freecamLastFrameTime);

      this.freecamActive = true;
      controls.enabled = false;
      this.forceGraph.instance.enablePointerInteraction(false);
      this.attachFreecamKeyListeners();
      this.applyNodeHover(null, false);
      this.requestPointerLock();
    } else {
      this.freecamActive = false;
      this.detachFreecamKeyListeners();
      this.clearPointerLockVerification();
      this.forceGraph.instance.enablePointerInteraction(true);
      if (document.pointerLockElement === this.rendererDomEl) document.exitPointerLock();
      camera.position.copy(this.freecamPosition);
      camera.quaternion.copy(this.freecamDirection);
      // TrackballControls rotates camera.up as part of its pose. Keep that
      // basis aligned with the freecam quaternion before handing control back.
      if ("noRotate" in controls) camera.up.copy(this.freecamUp);
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.freecamDirection);
      controls.target.copy(this.freecamPosition).addScaledVector(forward, FOCAL_FROM_CAMERA);
      controls.enabled = this.controlsWereEnabled;
      controls.update();
    }

    this.forceGraph.spatialNotes.setFreecamState(
      this.freecamActive,
      document.pointerLockElement === this.rendererDomEl
    );
  }

  private requestPointerLock(): void {
    if (!this.rendererDomEl || document.pointerLockElement === this.rendererDomEl) return;

    this.clearPointerLockVerification();
    this.forceGraph.spatialNotes.setPointerLockFailed(false);
    const rendererDomEl = this.rendererDomEl;
    if (typeof rendererDomEl.requestPointerLock !== "function") {
      this.handlePointerLockFailure();
      return;
    }

    try {
      const request = (
        rendererDomEl.requestPointerLock as unknown as () => Promise<void> | void
      ).call(rendererDomEl);
      this.pointerLockVerificationTimer = window.setTimeout(() => {
        this.pointerLockVerificationTimer = undefined;
        if (this.freecamActive && document.pointerLockElement !== rendererDomEl)
          this.handlePointerLockFailure();
      }, 500);
      if (request) {
        void request.catch(() => this.handlePointerLockFailure());
      }
    } catch {
      this.handlePointerLockFailure();
    }
  }

  private clearPointerLockVerification(): void {
    if (this.pointerLockVerificationTimer === undefined) return;
    window.clearTimeout(this.pointerLockVerificationTimer);
    this.pointerLockVerificationTimer = undefined;
  }

  private handlePointerLockFailure(): void {
    this.clearPointerLockVerification();
    this.pressedFreecamKeys.clear();
    this.freecamSpeedBoost = false;
    this.freecamVelocity.set(0, 0, 0);
    this.forceGraph.spatialNotes.setPointerLockFailed(true);
  }

  private getFreecamCursorReleaseInput(): FreecamCursorReleaseInput {
    return this.forceGraph.view.plugin.settingManager.getSettings().pluginSetting
      .freecamCursorReleaseInput;
  }

  private onFreecamPointerDown = (event: PointerEvent): void => {
    this.rendererDomEl?.focus();
    if (
      this.freecamActive &&
      event.button === 2 &&
      document.pointerLockElement === this.rendererDomEl &&
      this.getFreecamCursorReleaseInput() === FreecamCursorReleaseInput.rightClick
    ) {
      event.preventDefault();
      event.stopPropagation();
      document.exitPointerLock();
      return;
    }
    if (this.freecamActive && event.button === 0 && !this.forceGraph.spatialNotes.isInteracting) {
      this.requestPointerLock();
    }
  };

  private onFreecamContextMenu = (event: MouseEvent): void => {
    if (
      this.freecamActive &&
      this.getFreecamCursorReleaseInput() === FreecamCursorReleaseInput.rightClick
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  private onFreecamMouseMove = (event: MouseEvent): void => {
    if (
      !this.freecamActive ||
      !this.rendererDomEl ||
      document.pointerLockElement !== this.rendererDomEl
    )
      return;

    // Apply mouse deltas to the freshly captured quaternion itself. Rebuilding
    // from world yaw/pitch would zero its roll and cause the first-move snap
    // after returning from a tilted TrackballControls pose.
    this.freecamMouseEuler.set(
      -event.movementY * FREECAM_MOUSE_SENSITIVITY,
      -event.movementX * FREECAM_MOUSE_SENSITIVITY,
      0,
      "YXZ"
    );
    this.freecamMouseRotation.setFromEuler(this.freecamMouseEuler);
    this.freecamLevelStartTime = null;
    this.freecamDirection.multiply(this.freecamMouseRotation).normalize();
    this.updateFreecamUp();
  };

  private onPointerLockChange = (): void => {
    const pointerLocked = document.pointerLockElement === this.rendererDomEl;
    if (pointerLocked) {
      this.clearPointerLockVerification();
      this.forceGraph.spatialNotes.setPointerLockFailed(false);
    }
    this.pressedFreecamKeys.clear();
    this.freecamSpeedBoost = false;
    if (!pointerLocked) this.freecamVelocity.set(0, 0, 0);
    this.forceGraph.spatialNotes.setPointerLocked(pointerLocked);
  };

  private onPointerLockError = (): void => {
    if (this.freecamActive) this.handlePointerLockFailure();
  };

  private onWindowBlur = (): void => {
    this.pressedFreecamKeys.clear();
    this.freecamSpeedBoost = false;
    this.freecamVelocity.set(0, 0, 0);
  };

  /**
   *
   * if the input is undefined, return the current camera position. else this will move the camera to a specific position.
   */
  public cameraPosition(
    position: Partial<Coords> | undefined,
    lookAt: Coords | undefined,
    transitionDuration: number | undefined
  ) {
    const instance = this.forceGraph.instance;
    const camera = instance.camera();
    const controls = instance.controls() as OrbitControls;
    const tween = this.tween;
    const shouldLookDirectly = () => this.freecamActive || !controls.enabled;
    if (position === undefined && lookAt === undefined && transitionDuration === undefined) {
      return {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
    }

    if (position) {
      const finalPos = position;
      const finalLookAt = lookAt || { x: 0, y: 0, z: 0 };

      if (!transitionDuration) {
        // no animation

        setCameraPos(finalPos);
        setLookAt(finalLookAt);
      } else {
        const camPos = Object.assign({}, camera.position);
        const camLookAt = getLookAt();

        // create unique id for position tween
        const posTweenId = Math.random().toString(36).substring(2, 15);

        tween[posTweenId] = new TWEEN.Tween(camPos)
          .to(finalPos, transitionDuration)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(setCameraPos)
          .onComplete(() => {
            tween[posTweenId] = undefined;
          })
          .start();

        // create unique id for lookAt tween
        const lookAtTweenId = Math.random().toString(36).substring(2, 15);

        // Face direction in 1/3rd of time
        tween[lookAtTweenId] = new TWEEN.Tween(camLookAt)
          .to(finalLookAt, transitionDuration / 3)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(setLookAt)
          .onComplete(() => {
            tween[lookAtTweenId] = undefined;
          })
          .start();
      }

      function setCameraPos(pos: Partial<Coords>) {
        const { x, y, z } = pos;
        if (x !== undefined) camera.position.x = x;
        if (y !== undefined) camera.position.y = y;
        if (z !== undefined) camera.position.z = z;
      }

      function setLookAt(lookAt: Coords) {
        const lookAtVect = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
        if (controls.target && !shouldLookDirectly()) {
          controls.target = lookAtVect;
        } else {
          // Fly controls doesn't have target attribute
          camera.lookAt(lookAtVect); // note: lookAt may be overridden by other controls in some cases
        }
      }

      function getLookAt() {
        return Object.assign(
          new THREE.Vector3(0, 0, -1000).applyQuaternion(camera.quaternion).add(camera.position)
        );
      }
    }
  }

  /**
   * this will force the camera to look at a specific position
   * @param lookAt
   * @param transitionDuration
   */
  public cameraLookAt(lookAt: Coords, transitionDuration: number | undefined) {
    this.cameraPosition(undefined, lookAt, transitionDuration);
  }

  /**
   * this will force the camera to look at the center of the graph
   */
  public cameraLookAtCenter = () => {
    const cameraPosition = this.forceGraph.instance.camera().position;
    this.cameraPosition(cameraPosition, { x: 0, y: 0, z: 0 }, cameraLookAtCenterTransitionDuration);
  };

  public focusOnNodeByPath = (path: string) => {
    // TODO: test if this is right
    const node = (this.forceGraph.instance.graphData().nodes as (Node & Coords)[]).find(
      (n) => n.path === path
    );
    if (node) {
      this.focusOnCoords(node, 1000);
    }
  };

  public focusOnCoords = (coords: Coords, duration = 3000) => {
    // Aim at node from outside it
    const distance = FOCAL_FROM_CAMERA;
    const distRatio = 1 + distance / Math.hypot(coords.x, coords.y, coords.z);

    const newPos =
      coords.x || coords.y || coords.z
        ? { x: coords.x * distRatio, y: coords.y * distRatio, z: coords.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

    this.cameraPosition(
      newPos, // new position
      coords, // lookAt ({ x, y, z })
      duration // ms transition duration
    );
  };

  public isHighlightedNode = (node: Node): boolean => {
    return this.highlightedNodes.has(node.id);
  };

  public getNodeColor = (node: Node): string => {
    let color: string;
    const settings = this.forceGraph.view.settingManager.getCurrentSetting();
    const theme = this.forceGraph.view.theme;
    const searchResult = this.forceGraph.view.settingManager.searchResult;
    if (this.selectedNodes.has(node)) {
      color = selectedColor;
    } else if (this.isHighlightedNode(node)) {
      color =
        node === this.hoveredNode
          ? settings.display.nodeHoverColor
          : settings.display.nodeHoverNeighbourColor;
    } else {
      color = theme.graphNode;
      settings.groups.forEach((group, index) => {
        if (group.query.trim().length === 0) return;
        const searchStateGroup = searchResult.value.groups[index];
        if (searchStateGroup) {
          const searchGroupfilePaths = searchStateGroup.files.map((file) => file.path);

          // if the node path is in the searchGroupfiles, change the color to group.color
          if (searchGroupfilePaths.includes(node.path)) color = group.color;
        }
      });
    }
    const rgba = hexToRGBA(
      color,
      this.getIsAnyHighlighted() && !this.isHighlightedNode(node) ? 0.5 : 1
    );
    return rgba;
  };

  public getIsAnyHighlighted = () => {
    return this.highlightedNodes.size !== 0 || this.highlightedLinks.size !== 0;
  };

  public removeSelection() {
    this.selectedNodes.clear();
    this.updateColor();
  }

  public searchNode(path: string) {
    const targetNode = this.forceGraph.instance.graphData().getNodeByPath(path);
    if (targetNode) this.focusOnCoords(targetNode as Node & Coords);
    else createNotice("The node doesn't exist in the graph");
  }

  public openFileInNewTab(file: TFile) {
    // getLeaf(false) reuses whatever leaf is currently active instead of actually opening
    // a new tab (per Obsidian's own docs) - despite the name, this was silently swapping
    // the active pane's content in place, which is a very plausible way to leave a
    // third-party plugin's editor state (e.g. Ink's CodeMirror extensions) torn down
    // incorrectly on the reused leaf. getLeaf(true) actually creates a new leaf.
    this.forceGraph.view.plugin.app.workspace.getLeaf(true).openFile(file);
  }
}
