import { GraphType } from "@/SettingsSchemas";
import Graph3dPlugin from "@/main";
import { GraphItemView } from "@/views/graph/GraphItemView";
import { WorkspaceLeaf } from "obsidian";

export class GlobalGraphItemView extends GraphItemView {
  constructor(leaf: WorkspaceLeaf, plugin: Graph3dPlugin) {
    super(leaf, plugin, GraphType.global);
  }
}
