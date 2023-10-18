import ForceGraph3D, { ForceGraph3DInstance } from "3d-force-graph";
import { Node } from "@/graph/Node";
import { Link } from "@/graph/Link";
import { StateChange } from "@/util/State";
import Graph3dPlugin from "@/main";
import { Graph } from "@/graph/Graph";
import { NodeGroup } from "@/graph/NodeGroup";
import { rgba } from "polished";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { eventBus } from "@/util/EventBus";
import { GraphSettings } from "@/settings/GraphSettings";
import * as THREE from "three";
import { ItemView, TFile } from "obsidian";

/**
 * the Coords type in 3d-force-graph
 */
export type Coords = {
  x: number;
  y: number;
  z: number;
};

export type GraphNode = Node & Coords;

const LINK_PARTICLE_MULTIPLIER = 2;
const LINK_ARROW_WIDTH_MULTIPLIER = 5;
const PARTICLE_FREQUECY = 4;

const FOCAL_FROM_CAMERA = 400;
const DISTANCE_FROM_FOCAL = 300;
const BASE_NODE_OPACITY = 0.7;

function hexToRGBA(hex: string, alpha: number): string {
  // Remove the hash symbol if present
  hex = hex.replace("#", "");

  // Split the hex value into RGB components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Create the RGBA color value
  const rgba = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  return rgba;
}

// Adapted from https://github.com/vasturiano/3d-force-graph/blob/master/example/highlight/index.html
// D3.js 3D Force Graph

export class ForceGraph {
  private instance: ForceGraph3DInstance;
  private controls: OrbitControls | TrackballControls;

  private readonly rootHtmlElement: HTMLElement;

  /**
   * the node connected to the hover node
   */
  private readonly highlightedNodes: Set<string> = new Set();
  /**
   * the links connected to the hover node
   */
  private readonly highlightedLinks: Set<Link> = new Set();
  hoveredNode: Node | null;

  private readonly isLocalGraph: boolean;
  private graph: Graph;
  private readonly plugin: Graph3dPlugin;
  private myCube: THREE.Mesh;
  private nodeLabelEl: HTMLDivElement;
  private centerCoordinateArrow: {
    xArrow: THREE.ArrowHelper;
    yArrow: THREE.ArrowHelper;
    zArrow: THREE.ArrowHelper;
  };
  private spaceDown = false;
  private commandDown = false;
  private readonly origin = new THREE.Vector3(0, 0, 0);
  private view: ItemView;

  constructor(
    plugin: Graph3dPlugin,
    rootHtmlElement: HTMLElement,
    isLocalGraph: boolean,
    view: ItemView
  ) {
    this.rootHtmlElement = rootHtmlElement;
    this.isLocalGraph = isLocalGraph;
    this.plugin = plugin;
    this.view = view;

    // console.log("ForceGraph constructor", rootHtmlElement);

    this.createGraph();
    this.initListeners();
  }

  private cameraLookAtCenter = () => {
    const currentCameraPosition = this.instance.cameraPosition();

    this.instance.cameraPosition(
      currentCameraPosition, // new position
      { x: 0, y: 0, z: 0 }, // lookAt ({ x, y, z })
      3000 // ms transition duration
    );
  };

  private initListeners() {
    this.plugin.settingsState.onChange(this.handleSettingsChanged);
    if (this.isLocalGraph) this.plugin.openFileState.onChange(this.refreshGraphData);
    eventBus.on("graph-changed", this.refreshGraphData);
    eventBus.on("do-pull", () => {
      // look at the center of the graph
      this.cameraLookAtCenter();

      // pull together
      const currentDagOrientation = this.plugin.getSettings().display.dagOrientation;
      this.instance.dagMode("radialout");
      this.instance.numDimensions(3); // reheat simulation
      setTimeout(() => {
        const noDag = currentDagOrientation === "null";
        // @ts-ignore
        this.instance.dagMode(noDag ? null : currentDagOrientation);
        this.instance.graphData(this.getGraphData());
        this.instance.numDimensions(3); // reheat simulation
      }, 300);
    });
    eventBus.on(
      "search",
      (
        file: {
          file: TFile;
          type: "file";
        },
        event: Event
      ) => {
        const targetNode = this.graph.getNodeByPath(file.file.path);
        console.log("search", file, targetNode);
        if (targetNode) this.focusOnNode(targetNode as GraphNode);
      }
    );
  }

  private createCenterCoordinateArrow() {
    const xDir = new THREE.Vector3(1, 0, 0);
    const yDir = new THREE.Vector3(0, 1, 0);
    const zDir = new THREE.Vector3(0, 0, 1);

    xDir.normalize();
    yDir.normalize();
    zDir.normalize();

    const length = 100;

    const xArrow = new THREE.ArrowHelper(xDir, this.origin, length, 0xff0000);
    const yArrow = new THREE.ArrowHelper(yDir, this.origin, length, 0x00ff00);
    const zArrow = new THREE.ArrowHelper(zDir, this.origin, length, 0x0000ff);

    xArrow.visible =
      yArrow.visible =
      zArrow.visible =
        this.plugin.settingsState.value.display.showCenterCoordinates;

    this.centerCoordinateArrow = {
      xArrow,
      yArrow,
      zArrow,
    };

    this.instance.scene().add(xArrow).add(yArrow).add(zArrow);
  }

  private createGraph() {
    const myCube = new THREE.Mesh(
      new THREE.BoxGeometry(30, 30, 30),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );

    this.myCube = myCube;
    myCube.position.set(0, 0, -FOCAL_FROM_CAMERA);
    myCube.visible = false;
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        this.spaceDown = true;
        // this.controls.mouseButtons.LEFT = THREE.MOUSE.RIGHT;
      }
      if (e.metaKey) this.commandDown = true;
    });

    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.spaceDown = false;
        // this.controls.mouseButtons.LEFT = THREE.MOUSE.LEFT;
      }
      if (!e.metaKey) this.commandDown = false;
    });

    this.createInstance();
    this.createNodes();
    this.createLinks();
    this.createCenterCoordinateArrow();
    this.instance.scene().add(myCube);

    const camera = this.instance.camera() as THREE.PerspectiveCamera;
    const renderer = this.instance.renderer();
    const xArrow = this.centerCoordinateArrow.xArrow;
    const yArrow = this.centerCoordinateArrow.yArrow;
    const zArrow = this.centerCoordinateArrow.zArrow;
    const origin = this.origin;

    function onZoom(event: WheelEvent) {
      const distanceToCenter = camera.position.distanceTo(origin);
      camera.updateProjectionMatrix();
      xArrow.setLength(distanceToCenter / 10);
      yArrow.setLength(distanceToCenter / 10);
      zArrow.setLength(distanceToCenter / 10);
    }

    renderer.domElement.addEventListener("wheel", onZoom);

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

    this.controls = this.instance.controls() as OrbitControls;
    this.controls.mouseButtons.RIGHT = undefined;

    //  change the nav info text
    this.rootHtmlElement
      .querySelector(".scene-nav-info")
      ?.setText("Left-click: rotate, Mouse-wheel/middle-click: zoom, Cmd + left-click: pan");
  }

  private createNodeLabel(rootHtmlElement: HTMLElement) {
    const nodeLabelEl = rootHtmlElement.createDiv({
      cls: "node-label",
      text: "test",
    });
    nodeLabelEl.style.opacity = "0";
    this.nodeLabelEl = nodeLabelEl;
  }

  private createInstance() {
    const [width, height] = [this.rootHtmlElement.innerWidth, this.rootHtmlElement.innerHeight];
    // set the divEl to have z-index 0
    const divEl = document.createElement("div");
    divEl.style.zIndex = "0";
    this.createNodeLabel(divEl);
    const settings = this.plugin.getSettings();

    this.instance = ForceGraph3D({
      controlType: "orbit",
      extraRenderers: [
        // @ts-ignore https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/html-nodes/index.html#L27C9-L29
        new CSS2DRenderer({
          element: divEl,
        }),
      ],
    })(this.rootHtmlElement)
      .graphData(this.getGraphData())
      // .nodeLabel((node: Node) => `<div class="node-label">${node.name}</div>`)
      // @ts-ignore  we need to return null or empty string because by default it will access the name of node, see https://github.com/vasturiano/3d-force-graph#node-styling
      .nodeLabel((node: Node) => null)
      .nodeRelSize(settings.display.nodeSize)
      .backgroundColor(rgba(0, 0, 0, 0.0))
      .width(width)
      .height(height)
      //@ts-ignore
      .dagMode(settings.display.dagOrientation === "null" ? null : settings.display.dagOrientation)
      .dagLevelDistance(200);

    this.instance.showNavInfo();
  }

  private getNodeLabelText = (node: Node) => {
    const settings = this.plugin.getSettings();
    const fullPath = node.path;
    const fileNameWithExtension = node.name;
    const fullPathWithoutExtension = fullPath.substring(0, fullPath.lastIndexOf("."));
    const fileNameWithoutExtension = fileNameWithExtension.substring(
      0,
      fileNameWithExtension.lastIndexOf(".")
    );
    const text = !settings.display.showExtension
      ? settings.display.showFullPath
        ? fullPathWithoutExtension
        : fileNameWithoutExtension
      : settings.display.showFullPath
      ? fullPath
      : fileNameWithExtension;
    return text;
  };

  private getNodeOpacityEasedValue = (node: Node) => {
    // get the position of the node
    // @ts-ignore
    const obj = node.__threeObj as THREE.Object3D | undefined;
    const nodePosition = obj?.position as THREE.Vector3;
    // then get the distance between the node and this.myCube , console.log it
    const distance = nodePosition.distanceTo(this.myCube.position);
    // change the opacity of the nodeEl base on the distance
    // the higher the distance, the lower the opacity
    // when the distance is 300, the opacity is 0
    const normalizedDistance = Math.min(distance, DISTANCE_FROM_FOCAL) / DISTANCE_FROM_FOCAL;
    const easedValue = 0.5 - 0.5 * Math.cos(normalizedDistance * Math.PI);
    return easedValue;
  };

  private focusOnNode = (node: Node & Coords) => {
    // Aim at node from outside it
    const distance = FOCAL_FROM_CAMERA;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

    const newPos =
      node.x || node.y || node.z
        ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

    this.instance.cameraPosition(
      newPos, // new position
      node, // lookAt ({ x, y, z })
      3000 // ms transition duration
    );
  };

  private createNodes = () => {
    this.instance
      .nodeColor((node: Node) => {
        const color = this.getNodeColor(node);
        const factor = 1 / (1 - BASE_NODE_OPACITY);
        const rgba = hexToRGBA(color, (factor - this.getNodeOpacityEasedValue(node)) / factor);
        return rgba;
      })
      .onNodeHover(this.onNodeHover)
      .nodeOpacity(1)
      .nodeThreeObject((node: Node) => {
        const nodeEl = document.createElement("div");

        const text = this.getNodeLabelText(node);
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
          nodeEl.style.opacity = `${1 - this.getNodeOpacityEasedValue(node)}`;
        };

        return cssObject;
      })
      .nodeThreeObjectExtend(true);

    this.instance.onNodeClick((node: Node & Coords, mouseEvent: MouseEvent) => {
      if (this.commandDown) {
        this.focusOnNode(node);
        return;
      }

      const clickedNodeFile = this.plugin.app.vault.getFiles().find((f) => f.path === node.path);

      if (clickedNodeFile) {
        if (this.isLocalGraph) {
          this.plugin.app.workspace.getLeaf(false).openFile(clickedNodeFile);
        } else {
          this.view.leaf.openFile(clickedNodeFile);
        }
      }
    });
  };

  private createLinks = () => {
    const settings = this.plugin.getSettings();
    this.instance
      .linkWidth((link: Link) =>
        this.isHighlightedLink(link)
          ? settings.display.linkThickness * 1.5
          : settings.display.linkThickness
      )
      .linkDirectionalParticles((link: Link) =>
        this.isHighlightedLink(link) ? PARTICLE_FREQUECY : 0
      )
      .linkDirectionalParticleWidth(() => settings.display.linkThickness * LINK_PARTICLE_MULTIPLIER)
      .linkDirectionalArrowLength(
        () => settings.display.linkThickness * LINK_ARROW_WIDTH_MULTIPLIER
      )
      .linkDirectionalArrowRelPos(1)
      .onLinkHover(this.onLinkHover)
      .linkColor((link: Link) =>
        this.isHighlightedLink(link) ? settings.display.linkHoverColor : this.plugin.theme.textMuted
      )
      .d3Force("link")
      ?.distance(() => settings.display.linkDistance);
  };

  private getGraphData = (): Graph => {
    const settings = this.plugin.getSettings();
    if (this.isLocalGraph && this.plugin.openFileState.value) {
      this.graph = this.plugin.globalGraph.clone().getLocalGraph(this.plugin.openFileState.value);
      // console.log(this.graph);
    } else {
      // console.log(settings.filters.searchResult);
      this.graph = this.plugin.globalGraph.filter((node) => {
        return (
          (settings.filters.searchResult.length === 0 ||
            settings.filters.searchResult.includes(node.path)) &&
          // if not show orphans, the node must have at least one link
          (settings.filters.showOrphans || node.links.length > 0) &&
          // if not show attachments, the node must be ".md"
          (settings.filters.showAttachments || node.path.endsWith(".md"))
        );
      });
    }

    return this.graph;
  };

  private refreshGraphData = () => {
    // console.log("refresh graph data");
    this.instance.graphData(this.getGraphData());
  };

  public handleSettingsChanged = (data: StateChange<unknown, GraphSettings>) => {
    // if the filter settings is change
    if (
      data.currentPath === "filters.searchResult" ||
      data.currentPath === "filters.showOrphans" ||
      data.currentPath === "filters.showAttachments"
    ) {
      // update the graphData
      this.refreshGraphData();
    }

    if (data.currentPath === "display.nodeSize") {
      this.instance.nodeRelSize(data.newValue as number);
    } else if (data.currentPath === "display.linkDistance") {
      // https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/manipulate-link-force/index.html#L50-L55
      this.instance.d3Force("link")?.distance(data.newValue as number);
      this.instance.numDimensions(3); // reheat simulation
    } else if (data.currentPath === "display.dagOrientation") {
      const noDag = data.newValue === "null";
      // @ts-ignore
      this.instance.dagMode(noDag ? null : data.newValue);
      this.instance.numDimensions(3); // reheat simulation
    } else if (data.currentPath === "display.showCenterCoordinates") {
      this.centerCoordinateArrow.xArrow.visible =
        this.centerCoordinateArrow.yArrow.visible =
        this.centerCoordinateArrow.zArrow.visible =
          data.newValue as boolean;
    }
    // else if (data.currentPath === "display.nodeRepulsion") {
    // this.instance.d3Force("charge", d3.forceManyBody().strength(-1 * (data.newValue as number)));
    // this.instance.numDimensions(3); // reheat simulation
    // }

    this.instance.refresh(); // other settings only need a refresh
  };

  public updateDimensions() {
    const [width, height] = [this.rootHtmlElement.offsetWidth, this.rootHtmlElement.offsetHeight];
    this.setDimensions(width, height);
  }

  public setDimensions(width: number, height: number) {
    this.instance.width(width);
    this.instance.height(height);
  }

  private getNodeColor = (node: Node): string => {
    const settings = this.plugin.getSettings();
    if (this.isHighlightedNode(node)) {
      return node === this.hoveredNode
        ? settings.display.nodeHoverColor
        : settings.display.nodeHoverNeighbourColor;
    } else {
      let color = this.plugin.theme.textMuted;
      settings.groups.groups.forEach((group) => {
        // multiple groups -> last match wins
        if (NodeGroup.matches(group.query, node)) color = group.color;
      });
      return color;
    }
  };

  private onNodeHover = (node: Node | null) => {
    if ((!node && !this.highlightedNodes.size) || (node && this.hoveredNode === node)) return;

    // set node label text
    if (node) {
      const text = this.getNodeLabelText(node);
      this.nodeLabelEl.textContent = text;
      // @ts-ignore
      this.nodeLabelEl.style.color = node.color;
      this.nodeLabelEl.style.opacity = "1";
    } else {
      this.nodeLabelEl.style.opacity = "0";
    }

    this.clearHighlights();

    if (node) {
      this.highlightedNodes.add(node.id);
      node.neighbors.forEach((neighbor) => this.highlightedNodes.add(neighbor.id));
      const nodeLinks = this.graph.getLinksWithNode(node.id);

      if (nodeLinks) nodeLinks.forEach((link) => this.highlightedLinks.add(link));
    }
    this.hoveredNode = node ?? null;
    this.updateHighlight();
  };

  private isHighlightedLink = (link: Link): boolean => {
    return this.highlightedLinks.has(link);
  };

  private isHighlightedNode = (node: Node): boolean => {
    return this.highlightedNodes.has(node.id);
  };

  private onLinkHover = (link: Link | null) => {
    this.clearHighlights();

    if (link) {
      this.highlightedLinks.add(link);
      this.highlightedNodes.add(link.source.id);
      this.highlightedNodes.add(link.target.id);
    }
    this.updateHighlight();
  };

  private clearHighlights = () => {
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
  };

  private updateHighlight() {
    // trigger update of highlighted objects in scene
    this.instance
      .nodeColor(this.instance.nodeColor())
      .linkColor(this.instance.linkColor())
      .linkDirectionalParticles(this.instance.linkDirectionalParticles());
  }

  getInstance(): ForceGraph3DInstance {
    return this.instance;
  }
}
