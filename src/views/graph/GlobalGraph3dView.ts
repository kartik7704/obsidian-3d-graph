import { GlobalGraphSettings, GraphSetting } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { SearchResult } from "@/views/settings/GraphSettingsManager";
import { WorkspaceLeaf } from "obsidian";

const getNewGlobalGraph = (
  plugin: Graph3dPlugin,
  config?: {
    searchResults: SearchResult["filter"]["files"];
    filterSetting: GlobalGraphSettings["filter"];
  }
) => {
  if (!config) return plugin.globalGraph;
  return plugin.globalGraph
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

export class GlobalGraph3dView extends Graph3dView {
  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf) {
    super(leaf, plugin, GraphType.global, plugin.globalGraph);
  }

  public handleGroupColorSearchResultChange(): void {
    this.getForceGraph().interactionManager.updateColor();
  }

  public handleSearchResultChange(): void {
    this.updateGraphData();
  }

  public handleSettingUpdate(
    newSetting: GraphSetting,
    ...path: NestedKeyOf<GlobalGraphSettings>[]
  ): void {
    console.log(path);
    if (path.some((p) => p === "filter.showAttachments" || p === "filter.showOrphans")) {
      // we need to update force graph data
      this.updateGraphData();
    } else if (path.some((p) => p.startsWith("groups"))) {
      this.getForceGraph().interactionManager.updateColor();
    } else if (path.includes("display.nodeSize")) {
      this.getForceGraph().updateConfig({
        display: {
          nodeSize: newSetting.display.nodeSize,
        },
      });
    } else if (path.includes("display.linkDistance")) {
      this.getForceGraph().updateConfig({
        display: {
          linkDistance: newSetting.display.linkDistance,
        },
      });
    } else if (path.includes("display.nodeRepulsion")) {
      this.getForceGraph().updateConfig({
        display: {
          nodeRepulsion: newSetting.display.nodeRepulsion,
        },
      });
    } else if (path.includes("display.showCenterCoordinates")) {
      this.getForceGraph().updateConfig({
        display: {
          showCenterCoordinates: newSetting.display.showCenterCoordinates,
        },
      });
    } else if (path.includes("display.showExtension") || path.includes("display.showFullPath")) {
      this.getForceGraph().interactionManager.updateNodeLabelDiv();
    }
  }

  protected updateGraphData() {
    super.updateGraphData(
      getNewGlobalGraph(this.plugin, {
        searchResults: this.settingManager.searchResult.value.filter.files,
        filterSetting: this.settingManager.getCurrentSetting().filter,
      })
    );
  }

  public handleMetadataCacheChange(): void {
    this.updateGraphData();
  }
}
