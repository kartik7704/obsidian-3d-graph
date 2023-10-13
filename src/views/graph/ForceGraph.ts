import ForceGraph3D, { ForceGraph3DInstance } from "3d-force-graph";
import { Node } from "@/graph/Node";
import { Link } from "@/graph/Link";
import { StateChange } from "@/util/State";
import Graph3dPlugin from "@/main";
import { Graph } from "@/graph/Graph";
import { NodeGroup } from "@/graph/NodeGroup";
import { rgba } from "polished";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { eventBus } from "@/util/EventBus";
import { GraphSettings } from "@/settings/GraphSettings";
import { DagOrientation } from "@/settings/categories/DisplaySettings";
import * as d3 from "d3";

const LINK_PARTICLE_MULTIPLIER = 2;
const LINK_ARROW_WIDTH_MULTIPLIER = 5;
const PARTICLE_FREQUECY = 4;

// Adapted from https://github.com/vasturiano/3d-force-graph/blob/master/example/highlight/index.html
// D3.js 3D Force Graph

export class ForceGraph {
  private instance: ForceGraph3DInstance;
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

  constructor(plugin: Graph3dPlugin, rootHtmlElement: HTMLElement, isLocalGraph: boolean) {
    this.rootHtmlElement = rootHtmlElement;
    this.isLocalGraph = isLocalGraph;
    this.plugin = plugin;

    console.log("ForceGraph constructor", rootHtmlElement);

    this.createGraph();
    this.initListeners();
  }

  private initListeners() {
    this.plugin.settingsState.onChange(this.handleSettingsChanged);
    if (this.isLocalGraph) this.plugin.openFileState.onChange(this.refreshGraphData);
    eventBus.on("graph-changed", this.refreshGraphData);
  }

  private createGraph() {
    this.createInstance();
    this.createNodes();
    this.createLinks();
    // this.updateForce(settings.display.dagOrientation, settings.display.nodeRepulsion);
  }

  private createInstance() {
    const [width, height] = [this.rootHtmlElement.innerWidth, this.rootHtmlElement.innerHeight];
    const divEl = document.createElement("div");
    // set the divEl to have z-index 0
    divEl.style.zIndex = "0";
    const settings = this.plugin.getSettings();
    this.instance = ForceGraph3D({
      extraRenderers: [
        // @ts-ignore https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/html-nodes/index.html#L27C9-L29
        new CSS2DRenderer({
          element: divEl,
        }),
      ],
    })(this.rootHtmlElement)
      .graphData(this.getGraphData())
      // .nodeLabel(
      // 	(node: Node) => `<div class="node-label">${node.name}</div>`
      // )
      // @ts-ignore  we need to return null or empty string because by default it will access the name of node, see https://github.com/vasturiano/3d-force-graph#node-styling
      .nodeLabel((node: Node) => null)
      .nodeRelSize(settings.display.nodeSize)
      .backgroundColor(rgba(0, 0, 0, 0.0))
      .width(width)
      .height(height)
      //@ts-ignore
      .dagMode(settings.display.dagOrientation === "null" ? null : settings.display.dagOrientation)
      .dagLevelDistance(200);
  }

  private createNodes = () => {
    const settings = this.plugin.getSettings();
    this.instance
      .nodeColor((node: Node) => this.getNodeColor(node))
      // .nodeVisibility(this.doShowNode)
      .onNodeHover(this.onNodeHover)
      .nodeThreeObject((node: Node) => {
        const nodeEl = document.createElement("div");
        const fullPath = node.path;
        const fileNameWithExtension = node.name;
        const fullPathWithoutExtension = fullPath.substring(0, fullPath.lastIndexOf("."));
        const fileNameWithoutExtension = fileNameWithExtension.substring(
          0,
          fileNameWithExtension.lastIndexOf(".")
        );
        nodeEl.textContent = !settings.display.showExtension
          ? settings.display.showFullPath
            ? fullPathWithoutExtension
            : fileNameWithoutExtension
          : settings.display.showFullPath
          ? fullPath
          : fileNameWithExtension;
        // @ts-ignore
        nodeEl.style.color = node.color;
        nodeEl.className = "node-label";
        nodeEl.style.top = "20px";
        nodeEl.style.fontSize = "12px";
        nodeEl.style.padding = "1px 4px";
        nodeEl.style.borderRadius = "4px";
        nodeEl.style.backgroundColor = rgba(0, 0, 0, 0.5);
        nodeEl.style.userSelect = "none";
        return new CSS2DObject(nodeEl);
      })
      .nodeThreeObjectExtend(true);
  };

  private createLinks = () => {
    const settings = this.plugin.getSettings();
    this.instance
      .linkWidth((link: Link) =>
        this.isHighlightedLink(link)
          ? settings.display.linkThickness * 1.5
          : settings.display.linkThickness
      )
      // .linkVisibility(this.doShowLink)
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

  private updateForce = (dagOrientation: DagOrientation, nodeRepulsion: number) => {
    const settings = this.plugin.getSettings();
    const noDag = dagOrientation === "null";
    if (noDag) {
      // @ts-ignore
      this.instance
        .d3Force(
          "link",
          d3.forceLink().distance(() => settings.display.linkDistance)
        )
        // this will remove other force
        // @ts-ignore
        .d3Force("charge", d3.forceManyBody().strength(-1 * nodeRepulsion));

      // this.instance
      //   // @ts-ignore
      //   .d3Force("collide", null)
      //   // @ts-ignore
      //   .d3Force("center", null);
    } else {
      // @ts-ignore
      this.instance
        .d3Force(
          "link",
          d3
            .forceLink()
            .distance(() => settings.display.linkDistance)
            .strength(1)
        )
        .d3Force("charge", d3.forceManyBody().strength(-1 * nodeRepulsion));
      // this.instance
      //   .d3Force("collide", d3.forceCollide(110)) // change this value
      //   .d3Force("center", d3.forceCenter(1 / 2, 1 / 2));
    }
  };

  private getGraphData = (): Graph => {
    const settings = this.plugin.getSettings();
    if (this.isLocalGraph && this.plugin.openFileState.value) {
      this.graph = this.plugin.globalGraph.clone().getLocalGraph(this.plugin.openFileState.value);
      console.log(this.graph);
    } else {
      console.log(settings.filters.searchResult);
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
    console.log("refresh graph data");
    const currentDagOrientation = this.plugin.getSettings().display.dagOrientation;
    this.instance.dagMode("radialout");
    this.instance.numDimensions(3); // reheat simulation
    setTimeout(() => {
      const noDag = currentDagOrientation === "null";
      // @ts-ignore
      this.instance.dagMode(noDag ? null : currentDagOrientation);
      this.instance.graphData(this.getGraphData());
    }, 300);
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
      this.instance.dagMode("radialout");
      this.instance.numDimensions(3); // reheat simulation
      setTimeout(() => {
        const noDag = (data.newValue as DagOrientation) === "null";
        // @ts-ignore
        this.instance.dagMode(noDag ? null : data.newValue);
        this.instance.d3ReheatSimulation();
        // this.updateForce(data.newValue as DagOrientation, settings.display.nodeRepulsion);
        this.instance.numDimensions(3); // reheat simulation
      }, 300);
    } else if (data.currentPath === "display.nodeRepulsion") {
      // this.instance.d3Force("charge", d3.forceManyBody().strength(-1 * (data.newValue as number)));
      this.instance.numDimensions(3); // reheat simulation
    }

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
