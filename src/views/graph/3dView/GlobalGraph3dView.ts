import { GlobalGraphSettings, GraphType } from "@/SettingsSchemas";
import Graph3dPlugin from "@/main";
import { GlobalGraphItemView } from "@/views/graph/GlobalGraphItemView";
import { Graph3dView } from "@/views/graph/3dView/Graph3dView";
import { SearchResult } from "@/views/settings/GraphSettingsManager";
import { GlobalGraphSettingManager } from "@/views/settings/GlobalGraphSettingManager";
import { createInstance } from "@/util/LifeCycle";

const getNewGlobalGraph = (
  plugin: Graph3dPlugin,
  config?: {
    searchResults: SearchResult["filter"]["files"];
    filterSetting: GlobalGraphSettings["filter"];
  }
) => {
  if (!config) return plugin.globalGraph;
  return plugin.globalGraph
    .clone()
    .filter((node) => {
      // if node is not a markdown  and show attachment is false, then we will not show it
      if (!node.path.endsWith(".md") && !config.filterSetting.showAttachments) return false;
      //  if the search query is not empty and the search result is empty, then we don't need to filter the search result
      if (config.searchResults.length === 0 && config.filterSetting.searchQuery === "") return true;
      // if the node is not in the files, then we will not show it
      return config.searchResults.some((file) => file.path === node.path);
    })
    .filter((node) => {
      // if node is an orphan and show orphan is false, then we will not show it
      if (node.links.length === 0 && !config.filterSetting.showOrphans) return false;
      return true;
    });
};

type ConstructorParameters = [
  plugin: Graph3dPlugin,
  contentEl: HTMLDivElement,
  itemView: GlobalGraphItemView
];

export class GlobalGraph3dView extends Graph3dView {
  itemView: GlobalGraphItemView;
  settingManager: GlobalGraphSettingManager;
  private constructor(...[plugin, contentEl, itemView]: ConstructorParameters) {
    super(contentEl, plugin, GraphType.global, plugin.globalGraph);
    this.itemView = itemView;
    this.settingManager = new GlobalGraphSettingManager(this);
  }

  public handleGroupColorSearchResultChange(): void {
    this.forceGraph?.interactionManager.updateColor();
  }

  public handleSearchResultChange(): void {
    this.updateGraphData();
  }

  protected getNewGraphData() {
    return getNewGlobalGraph(this.plugin, {
      searchResults: this.settingManager.searchResult.value.filter.files,
      filterSetting: this.settingManager.getCurrentSetting().filter,
    });
  }

  protected updateGraphData() {
    super.updateGraphData(this.getNewGraphData());
  }

  public handleMetadataCacheChange(): void {
    this.updateGraphData();
  }

  static new(...args: ConstructorParameters) {
    // @ts-ignore
    return createInstance(GlobalGraph3dView, ...args);
  }
}
