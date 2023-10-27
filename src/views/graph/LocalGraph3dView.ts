import { LocalGraphSettings } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import { Graph } from "@/graph/Graph";
import { Node } from "@/graph/Node";
import { Link } from "@/graph/Link";
import Graph3dPlugin from "@/main";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { SearchResult } from "@/views/settings/GraphSettingsManager";
import { TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

/**
 *
 * @param graph
 * @param id the center node id
 * @param depth the max distance of the link away from the center node. If depth is 1,
 * then it mean the links directly connected to the center node. If depth is 2, then it means the links
 * directly connected to the center node and the links connected to the links connected to the center node
 * @param linkType
 * @returns nodes and link of a local graph. If link type is inlinks and outlinks, then it will be acyclic
 */
const traverseNode = (
  graph: Graph,
  id: string,
  depth: number,
  linkType: "both" | "outlinks" | "inlinks"
): { nodes: Node[]; links: Link[] } => {
  const visitedNodes = new Set<string>();
  const visitedLinks = new Set<string>();

  // FIXME: Create a queue of links instead of a queue of nodes
  const queue: { node: Node; linkDepth: number }[] = [];
  const startNode = graph.getNodeById(id);

  if (startNode) {
    queue.push({ node: startNode, linkDepth: 0 });
    visitedNodes.add(startNode.id); // Include the start node
  }

  while (queue.length > 0) {
    // FIXME: shift the link instead of node
    const { node, linkDepth } = queue.shift()!;
    if (!node) continue;

    // FIXME: check if the link is valid according to the link type

    // FIXME: if valid Process links at the current depth
    // add the nodes to visit nodes
    // add to visited links
    // for each nodes visited, add the link to visited links

    node.links.forEach((link) => {
      const neighbor = link.source === node ? link.target : link.source;
      const linkId = `${node.id}-${neighbor.id}`;

      // Check link type and visited status
      const isOutlink = link.source === node;
      const isInlink = link.target === node;
      if (
        visitedLinks.has(linkId) ||
        !(
          linkType === "both" ||
          (linkType === "outlinks" && isOutlink) ||
          (linkType === "inlinks" && isInlink)
        )
      ) {
        return;
      }

      // Mark the link and the node as visited
      visitedLinks.add(linkId);
      visitedNodes.add(neighbor.id);

      // If we haven't reached the depth limit, add the neighbor to the queue
      if (linkDepth + 1 < depth) {
        queue.push({ node: neighbor, linkDepth: linkDepth + 1 });
      }
    });
  }

  // Reconstruct the nodes and links from the visited sets
  return {
    nodes: [...visitedNodes].map((id) => graph.getNodeById(id)).filter(Boolean),
    links: Array.from(visitedLinks)
      .map((linkId) => {
        const [sourceId, targetId] = linkId.split("-");
        return graph.getLinkByIds(sourceId!, targetId!);
      })
      .filter(Boolean),
  };
};

/**
 * this is called by the plugin to create a new local graph.
 * It will not have any setting. The files is also
 */
const getNewLocalGraph = (
  plugin: Graph3dPlugin,
  config?: {
    centerFile: TAbstractFile | null;
    searchResults: SearchResult["filter"]["files"];
    filterSetting: LocalGraphSettings["filter"];
  }
) => {
  // get a new local graph (updated with cache) to make sure that the graph is updated with the latest cache

  // get the current search result

  // get the current show attachments and show orphans from graph setting

  // compose a new graph
  const centerFile = config?.centerFile ?? plugin.app.workspace.getActiveFile();

  if (!centerFile || !config) return Graph.createEmpty();

  const { nodes, links } = traverseNode(
    plugin.globalGraph,
    centerFile.path,
    config.filterSetting.depth,
    config.filterSetting.linkType
  );

  // active file must exist in local graph
  const graph = plugin.globalGraph
    // filter the nodes and links
    .filter(
      (node) => {
        // the center file, which must be shown
        if (node.path === centerFile.path) return true;
        return nodes.some((n) => n.path === node.path);
      }

      // (link) => {
      //   return links.some(
      //     (l) => l.source.path === link.source.path && l.target.path === link.target.path
      //   );
      // }
    )
    .filter((node) => {
      // the center file, which must be shown
      if (node.path === centerFile.path) return true;
      // if node is not a markdown  and show attachment is false, then we will not show it
      if (!node.path.endsWith(".md") && !config.filterSetting.showAttachments) return false;
      //  if the search query is not empty and the search result is empty, then we don't need to filter the search result
      if (config.searchResults.length === 0 && config.filterSetting.searchQuery === "") return true;
      // if the node is not in the files, then we will not show it, except
      return config.searchResults.some((file) => file.path === node.path);
    })
    .filter((node) => {
      // the center file, which must be shown
      if (node.path === centerFile.path) return true;
      // if node is an orphan and show orphan is false, then we will not show it
      if (node.links.length === 0 && !config.filterSetting.showOrphans) return false;
      return true;
    });

  return graph;
};

export class LocalGraph3dView extends Graph3dView {
  /**
   * when the app is just open, this can be null
   */
  public currentFile: TAbstractFile | null;

  constructor(plugin: Graph3dPlugin, leaf: WorkspaceLeaf) {
    super(leaf, plugin, GraphType.local, getNewLocalGraph(plugin));

    this.currentFile = this.app.workspace.getActiveFile();

    // if this is a local graph, then we need to listen to change of active file
    this.registerEvent(this.app.workspace.on("file-open", this.handleFileChange.bind(this)));
  }

  public handleFileChange = (file: TFile) => {
    if (!file) return;
    this.currentFile = file;
    this.updateGraphData();
  };

  public handleSearchResultChange(): void {
    this.updateGraphData();
  }

  public handleMetadataCacheChange(): void {
    this.updateGraphData();
  }

  protected getNewGraphData(): Graph {
    const graph = getNewLocalGraph(this.plugin, {
      centerFile: this.currentFile,
      searchResults: this.settingManager.searchResult.value.filter.files,
      filterSetting: this.settingManager.getCurrentSetting().filter,
    });
    return graph;
  }

  protected updateGraphData() {
    super.updateGraphData(this.getNewGraphData());
  }

  public handleGroupColorSearchResultChange(): void {
    this.forceGraph?.interactionManager.updateColor();
  }

  public handleSettingUpdate(
    newSetting: LocalGraphSettings,
    ...path: NestedKeyOf<LocalGraphSettings>[]
  ): void {
    super.handleSettingUpdate(newSetting, ...path);
    if (path.some((p) => p === "filter.depth" || p === "filter.linkType")) {
      this.updateGraphData();
    }
    if (path.some((p) => p === "display.dagOrientation")) {
      this.forceGraph.updateConfig({
        display: {
          dagOrientation: newSetting.display.dagOrientation,
        },
      });
    }
  }
}
