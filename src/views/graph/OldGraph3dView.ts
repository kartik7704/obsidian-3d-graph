// @ts-nocheck

import { ItemView, WorkspaceLeaf } from "obsidian";
import { ForceGraph } from "@/views/graph/ForceGraph";
import { GraphSettingManager } from "@/views/settings/GraphSettingsManager";
import Graph3dPlugin from "@/main";
import { config } from "@/config";

export class OldGraph3dView extends ItemView {
  /**
   * this can be undefined because the graph is not ready yet
   */
  private forceGraph: ForceGraph | undefined;
  private isLocalGraph: boolean = false;
  readonly plugin: Graph3dPlugin;
  private settingsView: GraphSettingManager;

  /**
   * this is actually the contentEl
   */
  private viewContent: HTMLDivElement;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf, isLocalGraph = false) {
    super(leaf);
    this.plugin = plugin;
    this.isLocalGraph = isLocalGraph;
    this.viewContent = this.containerEl.querySelector(".view-content") as HTMLDivElement;
  }

  onunload() {
    super.onunload();
    this.forceGraph?.getInstance()._destructor();
  }

  getForceGraph() {
    return this.forceGraph;
  }

  async onload() {
    const viewContent = this.containerEl.querySelector(".view-content") as HTMLElement;
    if (!viewContent) {
      console.error("Could not find view content");
      return;
    }

    viewContent.classList.add("graph-3d-view");
    const settings = new GraphSettingManager(this);
    this.settingsView = settings;
    viewContent.appendChild(settings);

    // TODO: for now simply hide the setting in local graph
    if (this.isLocalGraph) this.settingsView.style.display = "none";

    // the graph needs to be append before the settings
    this.appendGraph();
    viewContent.appendChild(settings);
  }

  getDisplayText(): string {
    return config.displayText[this.isLocalGraph ? "local" : "global"];
  }

  getViewType(): string {
    return config.viewType[this.isLocalGraph ? "local" : "global"];
  }

  getIcon(): string {
    return config.icon;
  }

  onResize() {
    super.onResize();
    if (this.forceGraph) this.forceGraph.updateDimensions();
  }

  getSettingsView(): GraphSettingManager {
    return this.settingsView;
  }

  /**
   * append the graph to the view content
   */
  appendGraph() {
    if (this.forceGraph) this.forceGraph.getInstance()._destructor();
    this.forceGraph = new ForceGraph(this.plugin, this.viewContent, this.isLocalGraph, this);
    this.viewContent.append(this.settingsView);
  }
}
