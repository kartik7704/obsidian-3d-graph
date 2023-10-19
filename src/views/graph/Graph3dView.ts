import { FuzzySuggestModal, ItemView, WorkspaceLeaf } from "obsidian";
import { ForceGraph } from "@/views/graph/ForceGraph";
import { GraphSettingsView } from "@/views/settings/GraphSettingsView";
import Graph3dPlugin from "@/main";

export class Graph3dView extends ItemView {
  private forceGraph: ForceGraph;
  private readonly isLocalGraph: boolean;
  readonly plugin: Graph3dPlugin;
  private settingsView: GraphSettingsView;
  public searchTriggers: {
    [id: string]: () => Promise<SearchResultFile[]>;
  } = {};

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf, isLocalGraph = false) {
    super(leaf);
    this.isLocalGraph = isLocalGraph;
    this.plugin = plugin;
  }

  onunload() {
    super.onunload();
    this.forceGraph?.getInstance()._destructor();
  }

  async showGraph() {
    const viewContent = this.containerEl.querySelector(".view-content") as HTMLElement;
    if (!viewContent) {
      console.error("Could not find view content");
      return;
    }
    // this.forceGraph.getInstance().renderer().domElement.style.display = "none";

    viewContent.classList.add("graph-3d-view");
    const settings = new GraphSettingsView(
      this.plugin.settingsState,
      this.plugin.theme,
      this.plugin,
      this
    );
    this.settingsView = settings;
    viewContent.appendChild(settings);

    // if not trigger search
    if (Object.keys(this.searchTriggers).length === 0) {
      const div = viewContent.createDiv({
        text: "loading graph...",
      });
      viewContent.style.display = "flex";
      viewContent.style.alignItems = "center";
      viewContent.style.justifyContent = "center";
      div.style.margin = "auto";
      console.log("waiting for search triggers");
      await waitFor(() => Object.keys(this.searchTriggers).length > 0);
      console.log("search triggers", this.searchTriggers, Object.keys(this.searchTriggers).length);

      const promises = Object.entries(this.searchTriggers).map(([id, trigger]) => {
        console.log("adding trigger", id);
        return trigger();
      });

      console.log(promises);
      const results = await Promise.all(promises);
      console.log("all results", results);
      // remove the loading text
      div.remove();
    }

    // the graph needs to be append before the settings
    this.appendGraph(viewContent);
    viewContent.appendChild(settings);
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

  getSettingsView(): GraphSettingsView {
    return this.settingsView;
  }

  private appendGraph(viewContent: HTMLElement) {
    this.forceGraph = new ForceGraph(this.plugin, viewContent, this.isLocalGraph, this);
    this.forceGraph.getInstance().onNodeRightClick((node: Node, mouseEvent: MouseEvent) => {
      console.log("right click", node, mouseEvent);
      //   show a modal
      const modal = new ExampleModal(this.app);
      modal.open();
    });
  }
}
import { Notice } from "obsidian";
import { SearchResultFile } from "@/views/atomics/addSearchInput";
import { waitFor } from "@/util/waitFor";

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
