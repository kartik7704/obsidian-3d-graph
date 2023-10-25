import { GraphSetting } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { WorkspaceLeaf } from "obsidian";

export class GlobalGraph3dView extends Graph3dView {
  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf) {
    super(leaf, plugin, GraphType.global, plugin.globalGraph);
  }

  public handleGroupColorChange(): void {
    throw new Error("Method not implemented.");
  }

  public handleSearchResultChange(): void {
    this.updateGraphData({
      files: this.settingManager.searchResult.value.filter.files,
    });
  }

  public handleSettingUpdate(
    newSetting: GraphSetting,
    ...path: NestedKeyOf<GraphSetting>[]
  ): void {}

  public handleMetadataCacheChange(): void {
    throw new Error("Method not implemented.");
  }
}
