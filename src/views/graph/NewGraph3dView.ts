import { GraphType } from "@/SettingsSchemas";
import { config } from "@/config";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { createNotice } from "@/util/createNotice";
import { NewForceGraph } from "@/views/graph/NewForceGraph";
import { GraphSettingManager } from "@/views/settings/GraphSettingsManager";
import { getGraphAfterProcessingConfig } from "@/views/settings/categories/getGraphAfterProcessingConfig";
import { App, ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";

const getGraphFromFiles = (app: App, files: TAbstractFile[]): Graph => {
  return Graph.createFromFiles(files, app);
};

export class NewGraph3dView extends ItemView {
  readonly plugin: Graph3dPlugin;
  /**
   * this can be undefined because the graph is not ready yet
   */
  private forceGraph: NewForceGraph;

  readonly graphType: GraphType;
  /**
   * if this is the local graph, this will be the current file ;
   */
  public currentFile: TAbstractFile | undefined;

  public readonly settingManager: GraphSettingManager;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf, graphType: GraphType) {
    super(leaf);
    this.plugin = plugin;
    this.graphType = graphType;

    if (graphType === GraphType.local) {
      const activeFile = this.app.workspace.getActiveFile();

      // if this is a local graph, then we need to listen to change of active file
      this.registerEvent(
        this.app.workspace.on("file-open", (file) => {
          if (file) {
            this.currentFile = file;

            const graph = getGraphAfterProcessingConfig(this.plugin, {
              files: [],
              graphType: GraphType.local,
              setting: this.settingManager.getCurrentSetting().filter,
              centerFile: file,
            });

            this.updateGraphData({ graph });

            // we need to append the setting so that setting will be in front of the graph
            this.contentEl.appendChild(this.settingManager.containerEl);
          }
        })
      );

      if (activeFile) {
        this.currentFile = activeFile;
      }
    }

    // set up some UI stuff
    this.contentEl.classList.add("graph-3d-view");
    this.settingManager = new GraphSettingManager(this);

    const graph =
      this.graphType === GraphType.local
        ? getGraphAfterProcessingConfig(this.plugin, {
            files: [],
            graphType: GraphType.local,
            setting: this.settingManager.getCurrentSetting().filter,
            centerFile: this.currentFile,
          })
        : this.plugin.globalGraph;

    // you need to set up the graph before setting so that the setting will be in front of the graph
    this.forceGraph = new NewForceGraph(
      this,
      graph,
      this.plugin.settingManager.getNewSetting(graphType)
    );

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
    const graph = this.forceGraph.instance.graphData();

    // get the first child of the content element
    const forceGraphEl = this.contentEl.firstChild;
    forceGraphEl?.remove();

    // destroy the old graph, remove the old graph completely from the DOM
    this.forceGraph.instance._destructor();

    // reassign a new graph base on setting like the constructor
    this.forceGraph = new NewForceGraph(this, graph, this.settingManager.getCurrentSetting());

    // move the setting to the front of the graph
    this.contentEl.appendChild(this.settingManager.containerEl);

    this.onResize();
  }

  /**
   * given some files and config, update the graph data.
   */
  public updateGraphData(
    param:
      | {
          files: TAbstractFile[];
        }
      | {
          graph: Graph;
        }
  ) {
    const graph = "files" in param ? getGraphFromFiles(this.app, param.files) : param.graph;
    const tooLarge =
      graph.nodes.length > this.plugin.settingManager.getSettings().pluginSetting.maxNodeNumber;
    if (tooLarge) {
      createNotice(`Graph is too large to be rendered. Have ${graph.nodes.length} nodes.`);
    }
    this.forceGraph.updateGraph(tooLarge ? Graph.createEmpty() : graph);
  }

  /**
   * handle setting update
   */
  public handleSettingUpdate = () => {};
}
