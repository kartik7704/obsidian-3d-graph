import { deleteNote } from "@/commands/deleteNote";
import { FuzzySuggestModal, TAbstractFile } from "obsidian";
import { Node } from "@/graph/Node";
import { createNotice } from "@/util/createNotice";
import { Graph3dView } from "@/views/graph/Graph3dView";

interface Command {
  title: string;
  function: (view: Graph3dView, file: TAbstractFile) => void;
}

const commands = [
  {
    title: "Delete Note",
    function: deleteNote,
  },
  {
    title: "Test Command",
    function: (view: Graph3dView, file: TAbstractFile) => {
      createNotice(`run on ${file.name}`);
    },
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
      const file = this.view.app.vault.getAbstractFileByPath(node.path);
      if (file) command.function(this.view, file);
    }
  }
}
