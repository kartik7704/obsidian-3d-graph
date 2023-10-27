import { Link, ResolvedLinkCache } from "@/graph/Link";
import { Node } from "@/graph/Node";
import { copy } from "copy-anything";
import { App, TAbstractFile } from "obsidian";

export class Graph {
  public readonly nodes: Node[];
  public readonly links: Link[];

  // Indexes to quickly retrieve nodes and links by id
  private readonly nodeIndex: Map<string, number>;
  private readonly linkIndex: Map<string, Map<string, number>>;

  constructor(
    nodes: Node[],
    links: Link[],
    nodeIndex: Map<string, number>,
    linkIndex: Map<string, Map<string, number>>
  ) {
    this.nodes = nodes;
    this.links = links;
    this.nodeIndex = nodeIndex || new Map<string, number>();
    this.linkIndex = linkIndex || new Map<string, Map<string, number>>();
  }

  public getNodeByPath = (path: string): Node | null => {
    return this.nodes.find((n) => n.path === path) ?? null;
  };

  // Returns a node by its id
  public getNodeById(id: string): Node | null {
    return this.nodes.find((n) => n.id === id) ?? null;
  }

  // Returns a link by its source and target node ids
  public getLinkByIds(sourceNodeId: string, targetNodeId: string): Link | null {
    const sourceLinkMap = this.linkIndex.get(sourceNodeId);
    if (sourceLinkMap) {
      const index = sourceLinkMap.get(targetNodeId);
      if (index !== undefined) {
        // @ts-ignore
        return this.links[index];
      }
    }
    return null;
  }

  // Returns the outgoing links of a node
  public getLinksFromNode(sourceNodeId: string): Link[] {
    const sourceLinkMap = this.linkIndex.get(sourceNodeId);
    if (sourceLinkMap) {
      // @ts-ignore
      return Array.from(sourceLinkMap.values()).map((index) => this.links[index]);
    }
    return [];
  }

  // Returns the outgoing and incoming links of a node
  public getLinksWithNode(nodeId: string): Link[] {
    // we need to check if the link consists of a Node instance
    // instead of just a string id,
    // because D3 will replace each string id with the real Node instance
    // once the graph is rendered
    // @ts-ignore
    if (this.links[0]?.source?.id) {
      return this.links.filter(
        // @ts-ignore
        (link) => link.source.id === nodeId || link.target.id === nodeId
      );
    } else {
      return this.links.filter((link) => link.source.id === nodeId || link.target.id === nodeId);
    }
  }

  // Clones the graph
  public clone = (): Graph => {
    return new Graph(
      copy(this.nodes),
      copy(this.links),
      copy(this.nodeIndex),
      copy(this.linkIndex)
    );
  };

  public static createEmpty = (): Graph => {
    return new Graph([], [], new Map(), new Map());
  };

  // Creates a graph using the Obsidian API
  public static createFromApp = (app: App): Graph => {
    const map = getMapFromMetaCache(app.metadataCache.resolvedLinks);

    const nodes = Node.createFromFiles(app.vault.getFiles());
    return Graph.createFromLinkMap(map, nodes);
  };

  public static createFromLinkMap(
    map: {
      [x: string]: string[];
    },
    nodes: Node[]
  ) {
    // create a new nodes
    const newNodes = nodes.map((n) => new Node(n.name, n.path, n.val));

    const links = [] as Link[];

    Object.entries(map)
      .map(([key, value]) => {
        const node1 = newNodes.find((node) => node.id === key);
        if (!node1) return null;
        return value.map((node2Id) => {
          const node2 = newNodes.find((node) => node.id === node2Id);
          if (!node2) return null;
          links.push(new Link(node1, node2));
          return node1.addNeighbor(node2);
        });
      })
      .flat()
      .filter(Boolean);

    // add the links back to node

    links.forEach((link) => {
      link.source.addLink(link);
      link.target.addLink(link);
    });

    return new Graph(newNodes, links, Node.createNodeIndex(newNodes), Link.createLinkIndex(links));
  }

  /**
   * filter the nodes of the graph, the links will be filtered automatically.
   * @param predicate what nodes to keep
   * @param graph the graph to filter
   * @returns a new graph
   */
  public filter = (
    predicate: (node: Node) => boolean,
    linksPredicate?: (link: Link) => boolean
  ) => {
    const filteredNodes = this.nodes.filter(predicate);
    const filteredLinks = this.links
      .filter((link) => {
        // the source and target nodes of a link must be in the filtered nodes
        return (
          filteredNodes.some((node) => link.source.id === node.id) &&
          filteredNodes.some((node) => link.target.id === node.id)
        );
      })
      .filter(linksPredicate ?? Boolean);

    // transform the link to linkmap
    const linkMap = Link.createLinkMap(filteredLinks);

    return Graph.createFromLinkMap(linkMap, filteredNodes);
  };

  public static compare = (graph1: Graph, graph2: Graph): boolean => {
    if (graph1.nodes.length !== graph2.nodes.length) {
      return false;
    }
    if (graph1.links.length !== graph2.links.length) {
      return false;
    }

    const graph2NodeIds = new Set(graph2.nodes.map((node) => node.id));

    // Check if all nodes in graph1 exist in graph2
    for (const node1 of graph1.nodes) {
      if (!graph2NodeIds.has(node1.id)) {
        return false;
      }
    }

    function getLinkId(link: Link): string {
      return `${link.source.path}-${link.target.path}`;
    }

    const graph2LinkIds = new Set(graph2.links.map(getLinkId));

    // Check if all links in graph1 exist in graph2
    for (const link1 of graph1.links) {
      if (!graph2LinkIds.has(getLinkId(link1))) {
        return false;
      }
    }

    return true;
  };

  /**
   * get the files from the graph
   */
  public static getFiles(app: App, graph: Graph): TAbstractFile[] {
    return graph.nodes.map((node) => app.vault.getAbstractFileByPath(node.path)).filter(Boolean);
  }
}

const getMapFromMetaCache = (resolvedLinks: ResolvedLinkCache) => {
  const result: Record<string, string[]> = {};
  Object.keys(resolvedLinks).map((nodeId) => {
    result[nodeId] =
      Object.keys(resolvedLinks[nodeId]!).map((nodePath) => {
        return nodePath;
      }) ?? [];
  });

  // remove self links
  Object.keys(result).forEach((nodeId) => {
    result[nodeId] = result[nodeId]?.filter((nodePath) => nodePath !== nodeId) ?? [];
  });
  return result;
};
