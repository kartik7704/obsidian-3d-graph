import { GraphType } from "@/SettingsSchemas";
import { config } from "@/config";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { NewForceGraph } from "@/views/graph/NewForceGraph";
import { GraphSettingManager } from "@/views/settings/GraphSettingsManager";
import { App, ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";

/**
 *  This is the entry point for the graph view
 */
const getGraph = (app: App): Graph => {
  // TODO: implement this
  return Graph.createFromApp(app);
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
  private currentFile: TAbstractFile;

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

            // recreate the graph view
            const graph = getGraph(this.plugin.app);
            this.forceGraph = new NewForceGraph(
              this,
              graph,
              this.plugin.settingManager.getNewSetting(graphType)
            );

            // we need to append the setting so that setting will be in front of the graph
            this.contentEl.appendChild(this.settingManager.containerEl);
          }
        })
      );

      if (activeFile) {
        this.currentFile = activeFile;
      }
    }

    console.warn("temporarily disabled");
    // the view is already initialized, so we can create the graph

    // you need to set up the graph before setting so that the setting will be in front of the graph
    const graph = getGraph(this.plugin.app);
    this.forceGraph = new NewForceGraph(
      this,
      graph,
      this.plugin.settingManager.getNewSetting(graphType)
    );

    // set up some UI stuff
    this.contentEl.classList.add("graph-3d-view");
    this.settingManager = new GraphSettingManager(this);
  }

  onload(): void {
    super.onload();
    this.plugin.activeGraphViews.push(this);
  }

  onunload(): void {
    super.onunload();
    this.forceGraph.getInstance()._destructor();
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

  public getForceGraph() {
    return this.forceGraph;
  }

  public refreshGraph() {
    // destroy the old graph, remove the old graph completely from the DOM
    // reassign a new graph base on setting like the constructor
    // then render it

    throw new Error("not implemented yet");
  }
}
