import { Graph3dView } from "@/views/graph/Graph3dView";
import { Node } from "@/graph/Node";

export const deleteNote = (view: Graph3dView, nodes: Set<Node>) => {
  for (const node of nodes) {
    const file = view.app.vault.getAbstractFileByPath(node.path);
    if (file) {
      view.app.vault.trash(file, view.app.vault.config.trashOption === "system");
    }
  }
};
