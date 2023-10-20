import { deleteNote } from "@/commands/deleteNote";
import { FuzzySuggestModal } from "obsidian";
import { Node } from "@/graph/Node";
import { Graph3dView } from "@/views/graph/Graph3dView";

interface Command {
  title: string;
  function: (app: Graph3dView, node: Node) => void;
}

const commands = [
  {
    title: "Delete Note",
    function: deleteNote,
  },
];

export class CommandModal extends FuzzySuggestModal<Command> {
  private nodes: Set<Node>;
  private view: Graph3dView;
  constructor(view: Graph3dView, selectedNodes: Set<Node>) {
    super(view.app);
    this.nodes = selectedNodes;
    this.view = view;
  }

  getItems() {
    return commands;
  }

  getItemText(command: Command): string {
    return command.title;
  }

  onChooseItem(command: Command, evt: MouseEvent | KeyboardEvent) {
    for (const node of this.nodes) {
      command.function(this.view, node);
    }
  }
}
