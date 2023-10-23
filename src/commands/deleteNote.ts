import { Graph3dView } from "@/views/graph/Graph3dView";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { TAbstractFile } from "obsidian";

export const deleteNote = (view: Graph3dView | NewGraph3dView, file: TAbstractFile) => {
  view.app.vault.trash(file, view.app.vault.config.trashOption === "system");
  // update the global graph
  view.plugin.globalGraph.update(view.app);
  // update the instance
  // view.getForceGraph()?.refreshGraphData();
};
