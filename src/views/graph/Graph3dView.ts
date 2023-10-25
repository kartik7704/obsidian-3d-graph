import { GraphSetting } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import { config } from "@/config";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { createNotice } from "@/util/createNotice";
import { NewForceGraph } from "@/views/graph/NewForceGraph";
import { GraphSettingManager } from "@/views/settings/GraphSettingsManager";
import { ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";

export abstract class Graph3dView extends ItemView {
  readonly plugin: Graph3dPlugin;
  protected forceGraph: NewForceGraph | undefined;
  readonly graphType: GraphType;
  public readonly settingManager: GraphSettingManager<typeof this>;

  constructor(leaf: WorkspaceLeaf, plugin: Graph3dPlugin, graphType: GraphType, graph: Graph) {
    super(leaf);
    this.plugin = plugin;
    this.graphType = graphType;
    // this.forceGraph = new NewForceGraph(
    //   this,
    //   graph,
    //   MySettingManager.getNewSetting(this.graphType)
    // );
    this.settingManager = new GraphSettingManager<typeof this>(this);

    // set up some UI stuff
    this.contentEl.classList.add("graph-3d-view");
    // move the setting to the front of the graph
    this.contentEl.appendChild(this.settingManager.containerEl);
  }

  onload(): void {
    super.onload();
    this.plugin.activeGraphViews.push(this);
  }

  onunload(): void {
    super.onunload();
    this.forceGraph?.instance._destructor();
    this.plugin.activeGraphViews = this.plugin.activeGraphViews.filter((view) => view !== this);
  }

  getDisplayText(): string {
    return config.displayText[this.graphType];
  }

  getViewType(): string {
    return config.viewType[this.graphType];
  }

  getIcon(): string {
    return config.icon;
  }

  onResize() {
    super.onResize();
    if (this.forceGraph) this.forceGraph.updateDimensions();
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
    this.forceGraph?.instance._destructor();

    // reassign a new graph base on setting like the constructor
    // this.forceGraph = new NewForceGraph(this, graph, this.settingManager.getCurrentSetting());

    // move the setting to the front of the graph
    this.contentEl.appendChild(this.settingManager.containerEl);

    this.onResize();
  }

  /**
   * given some files and config, update the graph data.
   */
  protected updateGraphData(
    param:
      | {
          /**
           * as long as you tell me what files to change, I will update the graph view.
           * This `files` are the nodes that will be rendered on the graph
           */
          files: TAbstractFile[];
        }
      | {
          graph: Graph;
        }
  ) {
    const graph = "files" in param ? Graph.createFromFiles(param.files, this.app) : param.graph;
    const tooLarge =
      graph.nodes.length > this.plugin.settingManager.getSettings().pluginSetting.maxNodeNumber;
    if (tooLarge) {
      createNotice(`Graph is too large to be rendered. Have ${graph.nodes.length} nodes.`);
    }
    this.forceGraph?.updateGraph(tooLarge ? Graph.createEmpty() : graph);
    this.onResize();
  }

  /**
   * when the search result is change, the graph view need to know how to response to this.
   */
  public abstract handleSearchResultChange(): void;

  /**
   * when the group color is change, the graph view need to know how to response to this.
   */
  public abstract handleGroupColorChange(): void;

  /**
   * when the metadata cache is change, the global graph is updated. The graph view need to know how to response to this.
   */
  public abstract handleMetadataCacheChange(): void;

  /**
   * when the setting is updated, the graph view need to know how to response to this.
   */
  public abstract handleSettingUpdate(
    newSetting: GraphSetting,
    ...path: NestedKeyOf<GraphSetting>[]
  ): void;
}
