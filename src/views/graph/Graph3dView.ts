import { ItemView, WorkspaceLeaf } from "obsidian";
import { ForceGraph } from "@/views/graph/ForceGraph";
import { GraphSettingsView } from "@/views/settings/GraphSettingsView";
import Graph3dPlugin from "@/main";
import { SearchResultFile } from "@/views/atomics/addSearchInput";
import { waitFor } from "@/util/waitFor";

export class Graph3dView extends ItemView {
  /**
   * this can be undefined because the graph is not ready yet
   */
  private forceGraph: ForceGraph | undefined;
  private readonly isLocalGraph: boolean;
  readonly plugin: Graph3dPlugin;
  private settingsView: GraphSettingsView;
  public searchTriggers: {
    [id: string]: () => Promise<SearchResultFile[]>;
  } = {};

  private viewContent: HTMLDivElement;
  private div: HTMLDivElement;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf, isLocalGraph = false) {
    super(leaf);
    this.isLocalGraph = isLocalGraph;
    this.plugin = plugin;
    this.viewContent = this.containerEl.querySelector(".view-content") as HTMLDivElement;

    const div = this.viewContent.createDiv({
      text: "loading graph...",
    });
    this.viewContent.style.display = "flex";
    this.viewContent.style.alignItems = "center";
    this.viewContent.style.justifyContent = "center";
    div.style.margin = "auto";
    div.style.display = "hidden";
    this.div = div;
  }

  onunload() {
    super.onunload();
    this.forceGraph?.getInstance()._destructor();
  }

  getForceGraph() {
    return this.forceGraph;
  }

  async showGraph() {
    const viewContent = this.containerEl.querySelector(".view-content") as HTMLElement;
    if (!viewContent) {
      console.error("Could not find view content");
      return;
    }

    viewContent.classList.add("graph-3d-view");
    const settings = new GraphSettingsView(this.plugin.settingsState, this);
    this.settingsView = settings;
    viewContent.appendChild(settings);

    // if not trigger search
    if (Object.keys(this.searchTriggers).length === 0 || this.plugin.getIsReady()) {
      this.div.style.removeProperty("display");

      this.div.setText("Loading ...");

      // hide the settings
      this.settingsView.style.display = "none";

      this.div.setText("waiting for cache to be ready...");
      await waitFor(
        () => {
          return this.plugin.getIsReady();
        },
        { timeout: 60000, interval: 1000 }
      );

      this.div.setText("waiting for search triggers...");
      await waitFor(() => Object.keys(this.searchTriggers).length > 0, {});
      const promises = Object.entries(this.searchTriggers).map(([id, trigger]) => {
        console.log("adding trigger", id);
        return trigger();
      });

      const results = await Promise.all(promises);
      console.log("all results", results);
      // remove the loading text
      this.div.style.display = "none";

      // remove the setting style display
      this.settingsView.style.removeProperty("display");
    }

    // the graph needs to be append before the settings
    this.appendGraph(viewContent);
    viewContent.appendChild(settings);
  }

  getDisplayText(): string {
    return "3D-Graph";
  }

  getViewType(): string {
    return "3d_graph_view";
  }

  onResize() {
    super.onResize();
    if (this.forceGraph) this.forceGraph.updateDimensions();
  }

  getSettingsView(): GraphSettingsView {
    return this.settingsView;
  }

  private appendGraph(viewContent: HTMLElement) {
    this.forceGraph = new ForceGraph(this.plugin, viewContent, this.isLocalGraph, this);
    // TODO: adding a loading state
  }

  /**
   * hide the graph view and show the text
   */
  public hideGraphViewAndShowText(text?: string) {
    const sceneContainerEl = this.viewContent.querySelector(".scene-container") as HTMLDivElement;
    // set display none
    sceneContainerEl.style.display = "none";

    if (text) {
      // show the text
      this.div.style.removeProperty("display");
      this.div.setText(text);
    }
  }

  public showGraphViewAndHideText() {
    const sceneContainerEl = this.viewContent.querySelector(".scene-container") as HTMLDivElement;
    // set display none
    sceneContainerEl.style.removeProperty("display");

    // hide the text
    this.div.style.display = "none";
  }
}
