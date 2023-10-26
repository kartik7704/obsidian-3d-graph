import { GraphSetting, LocalGraphSettings } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { SearchResult } from "@/views/settings/GraphSettingsManager";
import { TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

/**
 * this is called by the plugin to create a new local graph.
 * It will not have any setting. The files is also
 */
const getNewLocalGraph = (
  plugin: Graph3dPlugin,
  config?: {
    centerFile: TAbstractFile | null;
    searchResults: SearchResult["filter"]["files"];
    filterSetting: LocalGraphSettings["filter"];
  }
) => {
  // get a new local graph (updated with cache) to make sure that the graph is updated with the latest cache

  // get the current search result

  // get the current show attachments and show orphans from graph setting

  // compose a new graph
  const centerFile = config?.centerFile ?? plugin.app.workspace.getActiveFile();

  if (!centerFile || !config) return Graph.createEmpty();

  // active file must exist in local graph
  return plugin.globalGraph
    .getLocalGraph({
      path: centerFile?.path ?? "",
      depth: config.filterSetting.depth,
      linkType: config.filterSetting.linkType,
    })
    .filter((node) => {
      // the center file, which must be shown
      if (node.path === centerFile.path) return true;
      // if node is not a markdown  and show attachment is false, then we will not show it
      if (!node.path.endsWith(".md") && !config.filterSetting.showAttachments) return false;
      //  if the search query is not empty and the search result is empty, then we don't need to filter the search result
      if (config.searchResults.length === 0 && config.filterSetting.searchQuery === "") return true;
      // if the node is not in the files, then we will not show it, except
      return config.searchResults.some((file) => file.path === node.path);
    })
    .filter((node) => {
      // the center file, which must be shown
      if (node.path === centerFile.path) return true;
      // if node is an orphan and show orphan is false, then we will not show it
      if (node.links.length === 0 && !config.filterSetting.showOrphans) return false;
      return true;
    });
};

export class LocalGraph3dView extends Graph3dView {
  /**
   * when the app is just open, this can be null
   */
  public currentFile: TAbstractFile | null;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf) {
    super(leaf, plugin, GraphType.local, getNewLocalGraph(plugin));

    this.currentFile = this.app.workspace.getActiveFile();

    // if this is a local graph, then we need to listen to change of active file
    this.registerEvent(this.app.workspace.on("file-open", this.handleFileChange.bind(this)));
  }

  public handleFileChange = (file: TFile) => {
    if (!file) return;
    this.currentFile = file;
    this.updateGraphData();
  };

  public handleSearchResultChange(): void {
    this.updateGraphData();
  }

  public handleMetadataCacheChange(): void {
    this.updateGraphData();
  }

  protected updateGraphData() {
    super.updateGraphData(
      getNewLocalGraph(this.plugin, {
        centerFile: this.currentFile,
        searchResults: this.settingManager.searchResult.value.filter.files,
        filterSetting: this.settingManager.getCurrentSetting().filter,
      })
    );
  }

  public handleGroupColorSearchResultChange(): void {
    console.error("Method not implemented.");
  }

  public handleSettingUpdate(newSetting: GraphSetting, ...path: NestedKeyOf<GraphSetting>[]): void {
    // we don't handle whole setting change here
    if (path.includes("")) return;
    // we don't handle search query and group search query
    if (path.includes("filter.searchQuery") || path.some((p) => p.startsWith("groups"))) return;
    if (path.includes("filter.showAttachments") || path.includes("filter.showOrphans")) {
      // we need to update force graph data
      this.updateGraphData();
      return;
    }

    console.error("Method not implemented.");
  }
}
