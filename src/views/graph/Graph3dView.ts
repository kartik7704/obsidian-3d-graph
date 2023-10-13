import { FuzzySuggestModal, ItemView, WorkspaceLeaf } from "obsidian";
import { Node } from "@/graph/Node";
import { ForceGraph } from "@/views/graph/ForceGraph";
import { GraphSettingsView } from "@/views/settings/GraphSettingsView";
import Graph3dPlugin from "@/main";

export class Graph3dView extends ItemView {
  private forceGraph: ForceGraph;
  private readonly isLocalGraph: boolean;
  private readonly plugin: Graph3dPlugin;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf, isLocalGraph = false) {
    super(leaf);
    this.isLocalGraph = isLocalGraph;
    this.plugin = plugin;
  }

  onunload() {
    super.onunload();
    this.forceGraph?.getInstance()._destructor();
  }

  showGraph() {
    const viewContent = this.containerEl.querySelector(".view-content") as HTMLElement;

    if (viewContent) {
      viewContent.classList.add("graph-3d-view");
      this.appendGraph(viewContent);
      const settings = new GraphSettingsView(
        this.plugin.settingsState,
        this.plugin.theme,
        this.plugin.app
      );
      viewContent.appendChild(settings);
    } else {
      console.error("Could not find view content");
    }
  }

  getDisplayText(): string {
    return "3D-Graph";
  }

  getViewType(): string {
    return "3d_graph_view";
  }

  onResize() {
    super.onResize();
    this.forceGraph.updateDimensions();
  }

  private appendGraph(viewContent: HTMLElement) {
    this.forceGraph = new ForceGraph(this.plugin, viewContent, this.isLocalGraph);

    this.forceGraph.getInstance().onNodeClick((node: Node, mouseEvent: MouseEvent) => {
      const clickedNodeFile = this.app.vault.getFiles().find((f) => f.path === node.path);

      if (clickedNodeFile) {
        if (this.isLocalGraph) {
          this.app.workspace.getLeaf(false).openFile(clickedNodeFile);
        } else {
          this.leaf.openFile(clickedNodeFile);
        }
      }
    });

    this.forceGraph.getInstance().onNodeRightClick((node: Node, mouseEvent: MouseEvent) => {
      console.log("right click", node, mouseEvent);

      //   show a modal
      const modal = new ExampleModal(this.app);
      modal.open();
    });
  }
}
import { Notice } from "obsidian";

interface Book {
  title: string;
  author: string;
}

const ALL_BOOKS = [
  {
    title: "How to Take Smart Notes",
    author: "Sönke Ahrens",
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
  },
];

export class ExampleModal extends FuzzySuggestModal<Book> {
  getItems(): Book[] {
    return ALL_BOOKS;
  }

  getItemText(book: Book): string {
    return book.title;
  }

  onChooseItem(book: Book, evt: MouseEvent | KeyboardEvent) {
    new Notice(`Selected ${book.title}`);
  }
}
