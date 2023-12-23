import { GraphType } from "@/SettingsSchemas";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { getNewLocalGraph } from "@/views/graph/LocalGraph3dView";
import { MarkdownPostProcessorContext, MarkdownRenderChild, MarkdownView, TFile } from "obsidian";

export class Test extends MarkdownRenderChild {
  plugin: Graph3dPlugin;
  source: string;
  ctx: MarkdownPostProcessorContext;
  markdownView: MarkdownView;

  // Add a property for the ResizeObserver
  resizeObserver: ResizeObserver;

  graph3dView: PostProcessorGraph3dView;

  constructor(
    contentEl: HTMLElement,
    plugin: Graph3dPlugin,
    source: string,
    ctx: MarkdownPostProcessorContext,
    markdownView: MarkdownView
  ) {
    super(contentEl);
    this.plugin = plugin;
    this.source = source;
    this.ctx = ctx;
    this.markdownView = markdownView;

    // Initialize the ResizeObserver to call the onResize method
    this.resizeObserver = new ResizeObserver((entries) => {
      // For this example, we're only observing the first entry (contentEl)
      this.onResize(entries[0]!);
    });

    // Start observing the content element
    this.resizeObserver.observe(contentEl);

    this.graph3dView = new PostProcessorGraph3dView(
      this.plugin,
      this.containerEl,
      this.markdownView,
      this
    );
  }

  onload(): void {
    super.onload();
    this.plugin.activeGraphViews.push(this.graph3dView);
  }

  onunload(): void {
    super.unload();
    // the unload is called when the markdown view doesn't exist anymore
    // change to another file doesn't count
    // close the file count
    console.log("unload");
    this.resizeObserver.disconnect();
    this.graph3dView.getForceGraph().instance._destructor();
    this.plugin.activeGraphViews = this.plugin.activeGraphViews.filter(
      (view) => view !== this.graph3dView
    );
  }

  // The method to be called when contentEl is resized
  onResize(entry: ResizeObserverEntry): void {
    // You can access the new dimensions of contentEl like this:
    const { width } = entry.contentRect;

    // Perform any actions you need on resize here
    this.graph3dView.getForceGraph().updateDimensions([width, 300]);

    // If you need to redraw or adjust anything related to the plugin or content,
    // this is where you'd do it.
  }
}

export class PostProcessorGraph3dView extends Graph3dView {
  parent: Test;
  currentFile: TFile | null;
  public handleSearchResultChange(): void {
    this.updateGraphData();
  }
  public handleGroupColorSearchResultChange(): void {
    this.forceGraph.interactionManager.updateColor();
  }
  public handleMetadataCacheChange(): void {
    this.updateGraphData();
  }

  protected updateGraphData() {
    super.updateGraphData(this.getNewGraphData());
  }

  protected getNewGraphData(): Graph {
    const graph = getNewLocalGraph(this.plugin, {
      centerFile: this.parent.markdownView.file,
      searchResults: this.settingManager.searchResult.value.filter.files,
      filterSetting: {
        // TODO: since this `getNewLocalGraph` function is originally for local graph, the setting is a bit different, we have to manually set it for now
        ...this.settingManager.getCurrentSetting().filter,
        depth: 1,
        linkType: "both",
      },
    });
    return graph;
  }
  constructor(
    plugin: Graph3dPlugin,
    contentEl: HTMLElement,
    markdownView: MarkdownView,
    parent: Test
  ) {
    super(
      contentEl as HTMLDivElement,
      plugin,
      GraphType.postProcessor,
      getNewLocalGraph(plugin),
      // @ts-ignore
      markdownView
    );

    this.parent = parent;
    this.currentFile = this.parent.markdownView.file;
  }
}
