import { GraphType } from "@/SettingsSchemas";
import Graph3dPlugin from "@/main";
import { GraphItemView } from "@/views/graph/GraphItemView";
import { WorkspaceLeaf } from "obsidian";

export class LocalGraphItemView extends GraphItemView {
  constructor(leaf: WorkspaceLeaf, plugin: Graph3dPlugin) {
    super(leaf, plugin, GraphType.local);
  }
}
