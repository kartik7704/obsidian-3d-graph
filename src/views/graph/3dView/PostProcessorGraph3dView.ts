import { GraphType } from "@/SettingsSchemas";
import type { Graph } from "@/graph/Graph";
import type Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/3dView/Graph3dView";
import { getNewLocalGraph } from "@/views/graph/3dView/LocalGraph3dView";
import { PostProcessorGraphSettingManager } from "@/views/settings/graphSettingManagers/PostProcessorGraphSettingManager";
import type { MarkdownView, TFile } from "obsidian";
import type { Graph3DViewMarkdownRenderChild } from "@/views/graph/Graph3DViewMarkdownRenderChild";
import { createInstance } from "@/util/LifeCycle";
import { ForceGraph } from "@/views/graph/ForceGraph";

type ConstructorParameters = [
  plugin: Graph3dPlugin,
  contentEl: HTMLElement,
  markdownView: MarkdownView,
  parent: Graph3DViewMarkdownRenderChild
];

export class PostProcessorGraph3dView extends Graph3dView {
  itemView: MarkdownView & {
    file: TFile;
  };
  parent: Graph3DViewMarkdownRenderChild;
  settingManager: PostProcessorGraphSettingManager;

  public handleSearchResultChange(): void {
    this.updateGraphData();
  }
  public handleGroupColorSearchResultChange(): void {
    this.forceGraph.interactionManager.updateColor();
  }
  public handleMetadataCacheChange(): void {
    this.updateGraphData();
  }

  protected updateGraphData() {
    super.updateGraphData(this.getNewGraphData());
  }

  protected getNewGraphData(): Graph {
    const graph = getNewLocalGraph(this.plugin, {
      centerFile: this.parent.markdownView.file,
      searchResults: this.settingManager.searchResult.value.filter.files,
      filterSetting: {
        // TODO: since this `getNewLocalGraph` function is originally for local graph, the setting is a bit different, we have to manually set it for now
        ...this.settingManager.getCurrentSetting().filter,
        depth: 1,
        linkType: "both",
      },
    });
    return graph;
  }
  private constructor(...[plugin, contentEl, markdownView, parent]: ConstructorParameters) {
    super(contentEl as HTMLDivElement, plugin, GraphType.postProcessor);
    this.parent = parent;
    this.itemView = markdownView as MarkdownView & {
      file: TFile;
    };
    this.settingManager = new PostProcessorGraphSettingManager(this);
  }

  static new(...args: ConstructorParameters) {
    // @ts-ignore
    return createInstance(PostProcessorGraph3dView, ...args);
  }

  onReady(): void {
    this.forceGraph = new ForceGraph(this, getNewLocalGraph(this.plugin));
  }
}
