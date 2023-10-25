import { GraphSetting, MySettingManager } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { getGraphAfterProcessingConfig } from "@/views/settings/categories/getGraphAfterProcessingConfig";
import { TAbstractFile, WorkspaceLeaf } from "obsidian";

/**
 * this is called by the plugin to create a new local graph.
 * It will not have any setting. The files is also
 */
const getNewLocalGraph = (plugin: Graph3dPlugin) => {
  const currentFile = plugin.app.workspace.getActiveFile();
  return currentFile
    ? getGraphAfterProcessingConfig(plugin, {
        searchResults: [],
        graphType: GraphType.local,
        filterSetting: MySettingManager.getNewSetting(GraphType.local).filter,
        centerFile: currentFile,
      })
    : Graph.createEmpty();
};

export class LocalGraph3dView extends Graph3dView {
  public handleSettingUpdate(newSetting: GraphSetting, ...path: NestedKeyOf<GraphSetting>[]): void {
    console.error("Method not implemented.");
  }
  /**
   * when the app is just open, this can be null
   */
  public currentFile: TAbstractFile | null;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf) {
    super(
      leaf,
      plugin,
      GraphType.local,
      plugin.app.workspace.getActiveFile() ? getNewLocalGraph(plugin) : Graph.createEmpty()
    );

    this.currentFile = this.app.workspace.getActiveFile();

    // if this is a local graph, then we need to listen to change of active file
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        if (!file) return;

        this.currentFile = file;

        console.warn("the files cannot be [], it need to respect the current search result");
        const graph = getGraphAfterProcessingConfig(this.plugin, {
          searchResults: [],
          graphType: this.graphType,
          filterSetting: this.settingManager.getCurrentSetting().filter,
          centerFile: file,
        });

        this.updateGraphData({ graph });

        // we need to append the setting so that setting will be in front of the graph
        this.contentEl.appendChild(this.settingManager.containerEl);
      })
    );
  }

  public handleSearchResultChange(): void {
    console.error("not implemented");
  }

  public handleLinkTypeChange(linkType: "both" | "inlinks" | "outlinks") {
    const graph = this.plugin.globalGraph.getLocalGraph({
      path: this.currentFile?.path ?? "",
      depth: this.settingManager.getCurrentSetting().filter.depth,
      linkType,
    });
    this.updateGraphData({ graph });
  }

  public handleDepthChange(depth: number) {
    const graph = this.plugin.globalGraph.getLocalGraph({
      path: this.currentFile?.path ?? "",
      depth,
      linkType: this.settingManager.getCurrentSetting().filter.linkType,
    });
    this.updateGraphData({ graph });
  }

  public handleMetadataCacheChange(): void {
    console.error("Method not implemented.");
  }

  public handleGroupColorChange(): void {
    console.error("Method not implemented.");
  }
}
