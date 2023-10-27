import ForceGraph3D, { ForceGraph3DInstance } from "3d-force-graph";
import { Graph } from "@/graph/Graph";
import { CenterCoordinates } from "@/views/graph/CenterCoordinates";
import * as THREE from "three";
import * as d3 from "d3-force-3d";
import { hexToRGBA } from "@/util/hexToRGBA";
import { GlobalGraphSettings, LocalGraphSettings } from "@/SettingManager";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { FOCAL_FROM_CAMERA, ForceGraphEngine } from "@/views/graph/ForceGraphEngine";
import { DeepPartial } from "ts-essentials";
import { Node } from "@/graph/Node";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { rgba } from "polished";

/**
 * the origin vectorss
 */
export const origin = new THREE.Vector3(0, 0, 0);

type MyForceGraph3DInstance = Omit<ForceGraph3DInstance, "graphData"> & {
  graphData: {
    (): Graph; // When no argument is passed, it returns a Graph
    (graph: Graph): MyForceGraph3DInstance; // When a Graph is passed, it returns MyForceGraph3DInstance
  };
};

/**
 * this class control the config and graph of the force graph. The interaction is not control here.
 */
export class NewForceGraph {
  /**
   * this can be a local graph or a global graph
   */
  public readonly view: Graph3dView;
  // private config: LocalGraphSettings | GlobalGraphSettings;

  public readonly instance: MyForceGraph3DInstance;
  public readonly centerCoordinates: CenterCoordinates;
  public readonly myCube: THREE.Mesh;

  public readonly interactionManager: ForceGraphEngine;
  public nodeLabelEl: HTMLDivElement;

  /**
   *
   * this will create a new force graph instance and render it to the view
   * @param view
   * @param config you have to provide the full config here!!
   */
  constructor(view: Graph3dView, graph: Graph) {
    this.view = view;
    this.interactionManager = new ForceGraphEngine(this);

    // get the content element of the item view
    const rootHtmlElement = view.contentEl as HTMLDivElement;

    // create the div element for the node label
    const divEl = this.createNodeLabel();
    // create the instance
    // these config will not changed by user
    this.instance = ForceGraph3D({
      controlType: "orbit",
      extraRenderers: [
        // @ts-ignore https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/html-nodes/index.html#L27C9-L29
        new CSS2DRenderer({
          element: divEl,
        }),
      ],
    })(rootHtmlElement)
      .graphData(graph)
      .nodeColor(this.interactionManager.getNodeColor)
      // @ts-ignore
      .nodeLabel((node) => null)
      // node size is proportional to the number of links
      .nodeVal((node: Node) => {
        return node.links.length;
      })
      .nodeOpacity(0.9)
      .linkOpacity(0.3)
      .onNodeHover(this.interactionManager.onNodeHover)
      .onNodeDrag(this.interactionManager.onNodeDrag)
      .onNodeDragEnd(this.interactionManager.onNodeDragEnd)
      .onNodeRightClick(this.interactionManager.onNodeRightClick)
      .onNodeClick(this.interactionManager.onNodeClick)
      .onLinkHover(this.interactionManager.onLinkHover)
      .linkColor(this.interactionManager.getLinkColor)
      .linkWidth(this.interactionManager.getLinkWidth)
      .linkDirectionalParticles(this.interactionManager.getLinkDirectionalParticles)
      .linkDirectionalParticleWidth(this.interactionManager.getLinkDirectionalParticleWidth)
      .linkDirectionalArrowLength(this.interactionManager.getLinkDirectionalArrowLength)
      .linkDirectionalArrowRelPos(1)
      // the options here are auto
      .width(rootHtmlElement.innerWidth)
      .height(rootHtmlElement.innerHeight)
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

    // add node label
    this.instance
      .nodeThreeObject((node: Node) => {
        const nodeEl = document.createElement("div");

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

        return cssObject;
      })
      .nodeThreeObjectExtend(true);

    // init other setting
    this.updateConfig(this.view.settingManager.getCurrentSetting());

    const controls = this.instance.controls() as OrbitControls;
    controls.mouseButtons.RIGHT = undefined;

    //  change the nav info text
    this.view.contentEl
      .querySelector(".scene-nav-info")
      ?.setText("Left-click: rotate, Mouse-wheel/middle-click: zoom, Cmd + left-click: pan");
  }

  private createNodeLabel() {
    const divEl = document.createElement("div");
    divEl.style.zIndex = "0";
    this.nodeLabelEl = divEl.createDiv({
      cls: "node-label",
      text: "",
    });
    this.nodeLabelEl.style.opacity = "0";
    return divEl;
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
  public updateDimensions() {
    const rootHtmlElement = this.view.contentEl as HTMLDivElement;
    const [width, height] = [rootHtmlElement.offsetWidth, rootHtmlElement.offsetHeight];
    this.instance.width(width).height(height);
  }

  public updateConfig(config: DeepPartial<LocalGraphSettings | GlobalGraphSettings>) {
    this.updateInstance(undefined, config);
  }

  /**
   * given a new force Graph, the update the graph and the instance
   */
  public updateGraph(graph: Graph) {
    // some optimization here
    // if the graph is the same, then we don't need to update the graph
    const same = Graph.compare(this.instance.graphData(), graph);
    if (!same) this.updateInstance(graph, undefined);
  }

  /**
   * given the changed things, update the instance
   */
  private updateInstance = (
    graph?: Graph,
    config?: DeepPartial<LocalGraphSettings | GlobalGraphSettings>
  ) => {
    if (graph !== undefined) this.instance.graphData(graph);
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

    if ((config as LocalGraphSettings)?.display?.dagOrientation !== undefined) {
      // @ts-ignore
      const noDag = config?.display.dagOrientation === "null";
      // @ts-ignore
      this.instance.dagMode(noDag ? null : config?.display.dagOrientation).dagLevelDistance(75);
      // this.instance
      //   .d3Force(
      //     "x",
      //     d3
      //       .forceX(0)
      //       .strength(
      //         noDag
      //           ? 1 -
      //               this.view.settingManager.getCurrentSetting().display.nodeRepulsion / 3000 +
      //               0.001
      //           : 2
      //       )
      //   )
      //   .d3Force(
      //     "y",
      //     d3
      //       .forceY(0)
      //       .strength(
      //         noDag
      //           ? 1 -
      //               this.view.settingManager.getCurrentSetting().display.nodeRepulsion / 3000 +
      //               0.001
      //           : 1
      //       )
      //   )
      //   .d3Force(
      //     "z",
      //     d3
      //       .forceZ(0)
      //       .strength(
      //         noDag
      //           ? 1 -
      //               this.view.settingManager.getCurrentSetting().display.nodeRepulsion / 3000 +
      //               0.001
      //           : 2
      //       )
      //   );
    }

    /**
     * derive the need to reheat the simulation
     */
    const needReheat =
      config?.display?.nodeRepulsion !== undefined ||
      config?.display?.linkDistance !== undefined ||
      (config as LocalGraphSettings)?.display?.dagOrientation !== undefined;

    if (needReheat) {
      this.instance.numDimensions(3); // reheat simulation
      this.instance.refresh();
    }
  };
}
