import {
  GlobalGraphSettings,
  GraphSetting,
  GraphType,
  LocalGraphSettings,
} from "@/SettingsSchemas";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { LifeCycle } from "@/util/LifeCycle";
import { ObsidianTheme } from "@/util/ObsidianTheme";
import { createNotice } from "@/util/createNotice";
import { ForceGraph } from "@/views/graph/ForceGraph";
import { GraphItemView } from "@/views/graph/GraphItemView";
import { GSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";
import { MarkdownView, TFile } from "obsidian";

type ItemView =
  | (MarkdownView & {
      file: TFile;
    })
  | GraphItemView;

export abstract class Graph3dView implements LifeCycle {
  readonly plugin: Graph3dPlugin;
  readonly graphType: GraphType;
  protected forceGraph: ForceGraph;
  public theme: ObsidianTheme;

  public abstract readonly settingManager: GSettingManager;
  public readonly contentEl: HTMLDivElement;
  /**
   * this view can be either Graph Item view or markdown view if it is a post processor view
   *
   * @remark this is the parent view
   */
  abstract itemView: ItemView;

  protected constructor(
    contentEl: HTMLDivElement,
    plugin: Graph3dPlugin,
    graphType: GraphType,
    graph: Graph
  ) {
    this.contentEl = contentEl;
    this.contentEl.classList.add("graph-3d-view");
    this.plugin = plugin;
    this.graphType = graphType;
    this.theme = new ObsidianTheme(this.plugin.app.workspace.containerEl);
    this.forceGraph = new ForceGraph(this, graph);
  }

  onReady() {
    // do something after ready
  }

  /**
   * get the current force graph object
   */
  public getForceGraph() {
    return this.forceGraph;
  }

  /**
   * destroy the old graph, remove the old graph completely from the DOM.
   * reassign a new graph base on setting like the constructor,
   * then render it.
   */
  public refreshGraph() {
    const graph = this.forceGraph?.instance.graphData();

    // get the first child of the content element
    const forceGraphEl = this.contentEl.firstChild;
    forceGraphEl?.remove();

    // destroy the old graph, remove the old graph completely from the DOM
    this.forceGraph.instance._destructor();

    // @ts-ignore
    this.forceGraph = null;

    this.theme = new ObsidianTheme(this.plugin.app.workspace.containerEl);

    this.updateGraphData(graph);
  }

  /**
   * given some files, update the graph data.
   */
  protected updateGraphData(graph: Graph) {
    const tooLarge =
      graph.nodes.length > this.plugin.settingManager.getSettings().pluginSetting.maxNodeNumber;
    if (tooLarge) {
      createNotice(`Graph is too large to be rendered. Have ${graph.nodes.length} nodes.`);
    }
    if (!this.forceGraph)
      this.forceGraph = new ForceGraph(this, tooLarge ? Graph.createEmpty() : graph);
    else this.forceGraph.updateGraph(tooLarge ? Graph.createEmpty() : graph);
    // get current focus element
    const focusEl = document.activeElement as HTMLElement | null;
    // move the setting to the front of the graph
    this.contentEl.appendChild(this.settingManager.containerEl);

    // focus on the focus element
    try {
      focusEl?.focus();
    } catch (e) {
      console.error((e as Error).message);
    }

    // make sure the render is at the right place if it is an item view
    if (this.itemView) this.itemView.onResize();
  }

  /**
   * when the search result is change, the graph view need to know how to response to this.
   */
  public abstract handleSearchResultChange(): void;

  /**
   * when the group color is change, the graph view need to know how to response to this.
   */
  public abstract handleGroupColorSearchResultChange(): void;

  /**
   * when the metadata cache is change, the global graph is updated. The graph view need to know how to response to this.
   */
  public abstract handleMetadataCacheChange(): void;

  protected abstract getNewGraphData(): Graph;

  /**
   * when the setting is updated, the graph view need to know how to response to this.
   */
  public handleSettingUpdate(
    newSetting: GraphSetting,
    ...path: (NestedKeyOf<GlobalGraphSettings> | NestedKeyOf<LocalGraphSettings>)[]
  ): void {
    if (path.includes("")) {
      this.forceGraph?.interactionManager.updateNodeLabelDiv();
    }
    if (path.some((p) => p === "filter.showAttachments" || p === "filter.showOrphans")) {
      // we need to update force graph data
      this.updateGraphData(this.getNewGraphData());
    }
    if (path.some((p) => p.startsWith("groups"))) {
      this.forceGraph?.interactionManager.updateColor();
    }
    if (path.includes("display.nodeSize")) {
      this.forceGraph?.updateConfig({
        display: {
          nodeSize: newSetting.display.nodeSize,
        },
      });
    }
    if (path.includes("display.linkDistance")) {
      this.forceGraph?.updateConfig({
        display: {
          linkDistance: newSetting.display.linkDistance,
        },
      });
    }
    if (path.includes("display.linkThickness")) {
      this.forceGraph?.updateConfig({
        display: {
          linkThickness: newSetting.display.linkThickness,
        },
      });
    }
    if (path.includes("display.nodeRepulsion")) {
      this.forceGraph?.updateConfig({
        display: {
          nodeRepulsion: newSetting.display.nodeRepulsion,
        },
      });
    }
    if (path.includes("display.showCenterCoordinates")) {
      this.forceGraph?.updateConfig({
        display: {
          showCenterCoordinates: newSetting.display.showCenterCoordinates,
        },
      });
    }
    if (path.includes("display.showExtension") || path.includes("display.showFullPath")) {
      this.forceGraph?.interactionManager.updateNodeLabelDiv();
    }
    if (path.includes("display.dagOrientation")) {
      this.forceGraph?.updateConfig({
        display: {
          dagOrientation: newSetting.display.dagOrientation,
        },
      });
    }
  }
}
