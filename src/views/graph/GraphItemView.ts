import { GraphType } from "@/SettingsSchemas";
import { config } from "@/config";
import type Graph3dPlugin from "@/main";
import { GlobalGraph3dView } from "@/views/graph/GlobalGraph3dView";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { LocalGraph3dView } from "@/views/graph/LocalGraph3dView";
import { ItemView, WorkspaceLeaf } from "obsidian";

export abstract class GraphItemView extends ItemView {
  readonly plugin: Graph3dPlugin;
  /**
   * although we have a graph type in graph 3d view, we still need this graph type here in the item view
   * because the `getViewType` and `getDisplayText` method is called before the graph 3d view is created
   */
  readonly graphType: GraphType;
  graph3dView: Graph3dView;
  constructor(leaf: WorkspaceLeaf, plugin: Graph3dPlugin, graphType: GraphType) {
    super(leaf);
    this.plugin = plugin;
    this.graphType = graphType;
    this.graph3dView =
      graphType === GraphType.local
        ? new LocalGraph3dView(this.plugin, this.contentEl as HTMLDivElement, this)
        : new GlobalGraph3dView(this.plugin, this.contentEl as HTMLDivElement, this);
  }

  onload(): void {
    super.onload();
    this.plugin.activeGraphViews.push(this.graph3dView);
  }

  onunload(): void {
    super.onunload();
    this.graph3dView.getForceGraph().instance._destructor();
    this.plugin.activeGraphViews = this.plugin.activeGraphViews.filter(
      (view) => view !== this.graph3dView
    );
  }

  getDisplayText(): string {
    return config.displayText[this.graphType === GraphType.local ? "local" : "global"];
  }

  getViewType(): string {
    return config.viewType[this.graphType === GraphType.local ? "local" : "global"];
  }

  getIcon(): string {
    return config.icon;
  }

  onResize() {
    super.onResize();
    if (this.graph3dView) this.graph3dView.getForceGraph().updateDimensions();
  }
}
