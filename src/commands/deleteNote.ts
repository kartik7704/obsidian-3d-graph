import type { Graph3dView } from "@/views/graph/3dView/Graph3dView";
import type { Node } from "@/graph/Node";

export const deleteNote = (view: Graph3dView, nodes: Set<Node>) => {
  const vault = view.plugin.app.vault;
  for (const node of nodes) {
    const file = vault.getAbstractFileByPath(node.path);
    if (file) {
      vault.trash(file, vault.config.trashOption === "system");
    }
  }
};
