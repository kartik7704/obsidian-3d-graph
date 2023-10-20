import { Node } from "@/graph/Node";
import { Graph3dView } from "@/views/graph/Graph3dView";

export const deleteNote = (view: Graph3dView, node: Node) => {
  const file = view.app.vault.getAbstractFileByPath(node.path);
  if (file) {
    view.app.vault.trash(file, view.app.vault.config.trashOption === "system");
    // update the global graph
    view.plugin.globalGraph.update(view.app);
    // update the instance
    view.getForceGraph()?.refreshGraphData();
  }
};
