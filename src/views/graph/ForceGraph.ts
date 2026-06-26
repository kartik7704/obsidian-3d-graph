import type { ForceGraph3DInstance } from "3d-force-graph";
import ForceGraph3D from "3d-force-graph";
import { Graph } from "@/graph/Graph";
import { CenterCoordinates } from "@/views/graph/CenterCoordinates";
import * as THREE from "three";
import * as d3 from "d3-force-3d";
import { hexToRGBA } from "@/util/hexToRGBA";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
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

export const getTooManyNodeMessage = (nodeNumber: number) =>
  `Graph is too large to be rendered. Have ${nodeNumber} nodes.`;

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
  /**
   * this can be a local graph or a global graph
   */
  public readonly view: V;
  // private config: LocalGraphSettings | GlobalGraphSettings;

  public readonly instance: MyForceGraph3DInstance;
  public readonly centerCoordinates: CenterCoordinates;
  public readonly myCube: THREE.Mesh;

  public readonly interactionManager: ForceGraphEngine;
  private readonly ringMeshes: Map<string, THREE.Mesh> = new Map();
  private readonly ringHandles: Map<string, { green: THREE.Mesh; blue: THREE.Mesh }> = new Map();
  private readonly raycaster = new THREE.Raycaster();
  private ringDragState: {
    ringPath: string;
    axis: "green" | "blue";
    lastY: number;
    lastX: number;
  } | null = null;
  public nodeLabelEl: HTMLDivElement;

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
    // create the instance
    // these config will not changed by user
    this.instance = ForceGraph3D({
      controlType: pluginSetting.rightClickToPan ? undefined : "orbit",
      extraRenderers: [
        // @ts-ignore https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/html-nodes/index.html#L27C9-L29
        new CSS2DRenderer({
          element: divEl,
        }),
      ],
    })(this.view.contentEl)
      .graphData(graph)
      .nodeColor(this.interactionManager.getNodeColor)
      // @ts-ignore
      .nodeLabel((node) => null)
      // node size is proportional to the number of links
      .nodeVal((node: Node) => {
        return (
          (node.links.length + 1) *
          // if the view has a currentFile, then it can be either local graph view or post processor view
          ("currentFile" in this.view && (this.view.currentFile as TFile)?.path === node.path
            ? 3
            : 1)
        );
      })
      .onBackgroundRightClick(() => {
        this.interactionManager.removeSelection();
      })
      .nodeOpacity(0.9)
      .linkOpacity(0.3)
      .onNodeHover(this.interactionManager.onNodeHover)
      .onNodeDrag(this.interactionManager.onNodeDrag)
      .onNodeDragEnd(this.interactionManager.onNodeDragEnd)
      .onNodeRightClick(this.interactionManager.onNodeRightClick)
      .onNodeClick(this.interactionManager.onNodeClick)
      // .onLinkHover(this.interactionManager.onLinkHover)
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
    renderer.domElement.addEventListener("wheel", (e) => this.interactionManager.onZoom(e));
    // add others things
    // add center coordinates
    this.centerCoordinates = new CenterCoordinates(
      this.view.settingManager.getCurrentSetting().display.showCenterCoordinates
    );
    scene.add(this.centerCoordinates.arrowsGroup);

    this.myCube = this.createCube();
    scene.add(this.myCube);

    this.initRingMeshes(scene);

    // add node label
    this.instance
      .nodeThreeObject((node: Node) => {
        const nodeEl = document.createElement("div");

        if (this.view.plugin.ringManager.isRing(node.path) &&
            !this.view.settingManager.getCurrentSetting().display.showRing) {
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
        }: pan`
      );
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
    const positions = this.view.plugin.nodePositionManager.getAll();

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
      const pos = positions[ring.path] ?? { x: 0, y: 0, z: 0 };
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.setRotationFromQuaternion(q);

      const { u, v } = this.getRingBasis(ring.normal);
      const center = new THREE.Vector3(pos.x, pos.y, pos.z);
      greenHandle.position.copy(center.clone().addScaledVector(u, ring.radius));
      blueHandle.position.copy(center.clone().addScaledVector(v, ring.radius));

      const showRing = this.view.settingManager.getCurrentSetting().display.showRing ?? true;
      mesh.visible = showRing;
      greenHandle.visible = showRing;
      blueHandle.visible = showRing;

      scene.add(mesh);
      scene.add(greenHandle);
      scene.add(blueHandle);
      this.ringMeshes.set(ring.path, mesh);
      this.ringHandles.set(ring.path, { green: greenHandle, blue: blueHandle });
    }

    const domEl = this.instance.renderer().domElement;
    domEl.addEventListener("pointermove", this.onHandleMouseMove, { capture: true });
    domEl.addEventListener("pointerdown", this.onHandleMouseDown, { capture: true });
    domEl.addEventListener("pointerup", this.onHandleMouseUp, { capture: true });
  }

  public updateRingMeshPositions(): void {
    const positions = this.view.plugin.nodePositionManager.getAll();
    for (const ring of this.view.plugin.ringManager.getRings()) {
      const mesh = this.ringMeshes.get(ring.path);
      const handles = this.ringHandles.get(ring.path);
      const pos = positions[ring.path];
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
        this.ringDragState = { ringPath, axis, lastY: event.clientY, lastX: event.clientX };
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
      this.ringDragState = null;
    }
  };

  private handleRingRotationDrag(event: MouseEvent): void {
    if (!this.ringDragState) return;
    const dx = event.clientX - this.ringDragState.lastX;
    const dy = event.clientY - this.ringDragState.lastY;
    this.ringDragState.lastX = event.clientX;
    this.ringDragState.lastY = event.clientY;

    const dragMag = Math.sqrt(dx * dx + dy * dy);
    if (dragMag < 0.5) return;

    const ring = this.view.plugin.ringManager.getRing(this.ringDragState.ringPath);
    if (!ring) return;

    // Handle direction in world space (where the handle sits on the ring)
    const { u, v } = this.getRingBasis(ring.normal);
    const handleDir = this.ringDragState.axis === "green" ? u : v;

    // Map screen drag to 3D world direction using camera axes
    const camera = this.instance.camera();
    const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    const desired3D = camRight.clone().multiplyScalar(dx).addScaledVector(camUp, -dy).normalize();

    // Rotation axis: perpendicular to both the handle direction and the desired movement
    // This makes the handle actually move toward where you dragged
    const rotAxis = new THREE.Vector3().crossVectors(handleDir, desired3D);
    if (rotAxis.lengthSq() < 0.0001) return;
    rotAxis.normalize();

    const q = new THREE.Quaternion().setFromAxisAngle(rotAxis, dragMag * 0.005);
    const newNormal = ring.normal.clone().applyQuaternion(q).normalize();
    this.view.plugin.ringManager.setNormal(ring.path, newNormal);

    this.updateRingMeshPositions();

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
    const divEl = document.createElement("div");
    divEl.style.zIndex = "0";
    const nodeLabelEl = divEl.createDiv({
      cls: "node-label",
      text: "",
    });
    nodeLabelEl.style.opacity = "0";
    return { divEl, nodeLabelEl };
  }

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

      const cwd = new THREE.Vector3();
      camera.getWorldDirection(cwd);
      cwd.multiplyScalar(FOCAL_FROM_CAMERA);
      cwd.add(camera.position);
      myCube.position.set(cwd.x, cwd.y, cwd.z);
      myCube.setRotationFromQuaternion(camera.quaternion);
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
      // Pin new nodes after simulation settles so they don't drift when dontMoveWhenDrag is on
      const setting = this.view.settingManager.getCurrentSetting();
      if (setting.display.dontMoveWhenDrag) {
        const posManager = this.view.plugin.nodePositionManager;
        const saved = posManager.getAll();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          }, 2000);
        }
      }
    } else console.log("same graph, no need to update");
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
    this.updateRingMeshPositions();
  }

  private applyNodePositions(graph: Graph): void {
    const saved = this.view.plugin.nodePositionManager.getAll();
    graph.nodes.forEach((node) => {
      const pos = saved[node.path];
      if (pos) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = node as any;
        n.fx = pos.x;
        n.fy = pos.y;
        n.fz = pos.z;
        n.x = pos.x;
        n.y = pos.y;
        n.z = pos.z;
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
    if (config?.display?.showRing !== undefined) {
      const visible = config.display.showRing;
      for (const mesh of this.ringMeshes.values()) mesh.visible = visible;
      for (const handles of this.ringHandles.values()) {
        handles.green.visible = visible;
        handles.blue.visible = visible;
      }
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
      // @ts-ignore
      this.instance.dagMode(noDag ? null : config?.display.dagOrientation).dagLevelDistance(75);
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
