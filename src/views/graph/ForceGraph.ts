import ForceGraph3D, { ForceGraph3DInstance } from "3d-force-graph";
import Node from "../../graph/Node";
import Link from "../../graph/Link";
import { StateChange } from "../../util/State";
import Graph3dPlugin from "../../main";
import Graph from "../../graph/Graph";
import { NodeGroup } from "../../settings/categories/GroupSettings";
import { rgba } from "polished";
import EventBus from "../../util/EventBus";
import {
	CSS2DObject,
	CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

const LINK_PARTICLE_MULTIPLIER = 2;
const LINK_ARROW_WIDTH_MULTIPLIER = 5;

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

	constructor(
		plugin: Graph3dPlugin,
		rootHtmlElement: HTMLElement,
		isLocalGraph: boolean
	) {
		this.rootHtmlElement = rootHtmlElement;
		this.isLocalGraph = isLocalGraph;
		this.plugin = plugin;

		console.log("ForceGraph constructor", rootHtmlElement);

		this.createGraph();
		this.initListeners();
	}

	private initListeners() {
		this.plugin.settingsState.onChange(this.onSettingsStateChanged);
		if (this.isLocalGraph)
			this.plugin.openFileState.onChange(this.refreshGraphData);
		EventBus.on("graph-changed", this.refreshGraphData);
	}

	private createGraph() {
		this.createInstance();
		this.createNodes();
		this.createLinks();
	}

	private createInstance() {
		const [width, height] = [
			this.rootHtmlElement.innerWidth,
			this.rootHtmlElement.innerHeight,
		];
		const divEl = document.createElement("div");
		// set the divEl to have z-index 0
		divEl.style.zIndex = "0";
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
			.nodeRelSize(this.plugin.getSettings().display.nodeSize)
			.backgroundColor(rgba(0, 0, 0, 0.0))
			.width(width)
			.height(height);
	}

	private getGraphData = (): Graph => {
		if (this.isLocalGraph && this.plugin.openFileState.value) {
			this.graph = this.plugin.globalGraph
				.clone()
				.getLocalGraph(this.plugin.openFileState.value);
			console.log(this.graph);
		} else {
			this.graph = this.plugin.globalGraph.clone();
		}

		return this.graph;
	};

	private refreshGraphData = () => {
		console.log("refresh graph data");
		this.instance.graphData(this.getGraphData());
	};

	public onSettingsStateChanged = (data: StateChange) => {
		console.log("settings changed ", data);
		if (data.currentPath === "display.nodeSize") {
			this.instance.nodeRelSize(data.newValue);
		} else if (data.currentPath === "display.linkThickness") {
			console.log("link width changed");
			this.instance
				.linkWidth(data.newValue)
				.linkDirectionalParticles((link: Link) =>
					this.isHighlightedLink(link) ? 4 : 0
				)
				.linkDirectionalParticleWidth(
					data.newValue * LINK_PARTICLE_MULTIPLIER
				)
				.linkDirectionalArrowLength(
					data.newValue * LINK_ARROW_WIDTH_MULTIPLIER
				)
				.linkDirectionalArrowRelPos(1);
		}

		this.instance.refresh(); // other settings only need a refresh
	};

	public updateDimensions() {
		const [width, height] = [
			this.rootHtmlElement.offsetWidth,
			this.rootHtmlElement.offsetHeight,
		];
		this.setDimensions(width, height);
	}

	public setDimensions(width: number, height: number) {
		this.instance.width(width);
		this.instance.height(height);
	}

	private createNodes = () => {
		this.instance
			.nodeColor((node: Node) => this.getNodeColor(node))
			.nodeVisibility(this.doShowNode)
			.onNodeHover(this.onNodeHover)
			.nodeThreeObject((node) => {
				console.log("nodeThreeObject", node);
				const nodeEl = document.createElement("div");
				// @ts-ignore
				// TODO: the node type is wrong here
				nodeEl.textContent = String(node.name ?? "undefined");
				// @ts-ignore
				nodeEl.style.color = node.color;
				// .node-label {
				//   font-size: 12px;
				//   padding: 1px 4px;
				//   border-radius: 4px;
				//   background-color: rgba(0,0,0,0.5);
				//   user-select: none;
				// }
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

	private getNodeColor = (node: Node): string => {
		if (this.isHighlightedNode(node)) {
			// Node is highlighted
			return node === this.hoveredNode
				? this.plugin.theme.interactiveAccentHover
				: this.plugin.theme.textAccent;
		} else {
			let color = this.plugin.theme.textMuted;
			this.plugin.getSettings().groups.groups.forEach((group) => {
				// multiple groups -> last match wins
				if (NodeGroup.matches(group.query, node)) color = group.color;
			});
			return color;
		}
	};

	private doShowNode = (node: Node) => {
		return (
			this.plugin.getSettings().filters.doShowOrphans ||
			node.links.length > 0
		);
	};

	private onNodeHover = (node: Node | null) => {
		if (
			(!node && !this.highlightedNodes.size) ||
			(node && this.hoveredNode === node)
		)
			return;

		this.clearHighlights();

		if (node) {
			this.highlightedNodes.add(node.id);
			node.neighbors.forEach((neighbor) =>
				this.highlightedNodes.add(neighbor.id)
			);
			const nodeLinks = this.graph.getLinksWithNode(node.id);

			if (nodeLinks)
				nodeLinks.forEach((link) => this.highlightedLinks.add(link));
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

	private createLinks = () => {
		this.instance
			.linkWidth((link: Link) =>
				this.isHighlightedLink(link)
					? this.plugin.getSettings().display.linkThickness * 1.5
					: this.plugin.getSettings().display.linkThickness
			)
			.linkDirectionalParticles((link: Link) =>
				this.isHighlightedLink(link) ? 4 : 0
			)
			.linkDirectionalParticleWidth(
				this.plugin.getSettings().display.linkThickness *
					LINK_PARTICLE_MULTIPLIER
			)
			.linkDirectionalArrowLength(
				this.plugin.getSettings().display.linkThickness *
					LINK_ARROW_WIDTH_MULTIPLIER
			)
			.linkDirectionalArrowRelPos(1)
			.onLinkHover(this.onLinkHover)

			.linkColor((link: Link) =>
				this.isHighlightedLink(link)
					? this.plugin.theme.textAccent
					: this.plugin.theme.textMuted
			);
	};

	private onLinkHover = (link: Link | null) => {
		this.clearHighlights();

		if (link) {
			this.highlightedLinks.add(link);
			this.highlightedNodes.add(link.source);
			this.highlightedNodes.add(link.target);
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
