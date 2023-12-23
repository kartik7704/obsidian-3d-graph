import { Graph3dView } from "@/views/graph/Graph3dView";
import { Node } from "@/graph/Node";

export const deleteNote = (view: Graph3dView, nodes: Set<Node>) => {
  const vault = view.plugin.app.vault;
  for (const node of nodes) {
    const file = vault.getAbstractFileByPath(node.path);
    if (file) {
      vault.trash(file, vault.config.trashOption === "system");
    }
  }
};
