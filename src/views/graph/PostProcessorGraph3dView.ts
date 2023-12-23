import Graph3dPlugin from "@/main";
import { ForceGraph } from "@/views/graph/ForceGraph";
import { MarkdownPostProcessorContext } from "obsidian";

export class GraphPostProcessor {
  source: string;
  el: HTMLElement;
  ctx: MarkdownPostProcessorContext;
  plugin: Graph3dPlugin;
  protected forceGraph: ForceGraph;
  constructor(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext,
    plugin: Graph3dPlugin
  ) {
    this.source = source;
    this.el = el;
    this.ctx = ctx;
    this.plugin = plugin;

    this.el.classList.add("graph-3d-view");
    // create a local graph
    // const graph = getNewLocalGraph(plugin);
  }
}
