import { Link } from "@/graph/Link";
import { Node } from "@/graph/Node";
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
    const index = this.nodeIndex.get(id);
    if (index !== undefined) {
      // @ts-ignore
      return this.nodes[index];
    }
    return null;
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

  /**
   * This method retrieves the local graph of a node, which includes all the other nodes and links
   * that are connected to the given node recursively based on the specified depth and link type.
   *
   * @returns the local graph of a node
   */
  public getLocalGraph(
    param: (
      | {
          id: string;
        }
      | {
          path: string;
        }
    ) & {
      depth: number;
      linkType: "both" | "inlinks" | "outlinks";
    }
  ): Graph {
    const node = "id" in param ? this.getNodeById(param.id) : this.getNodeByPath(param.path);

    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeIndex = new Map<string, number>();

    if (!node) {
      return new Graph([], [], new Map(), new Map());
    }

    const traverseNeighbors = (currentNode: Node, currentDepth: number) => {
      if (currentDepth > param.depth || nodeIndex.has(currentNode.id)) return; // Depth limit reached or node already traversed

      nodes.push(currentNode);
      nodeIndex.set(currentNode.id, nodes.length - 1);

      currentNode.links.forEach((link) => {
        if (
          param.linkType === "both" ||
          (param.linkType === "inlinks" && link.target.id === currentNode.id) ||
          (param.linkType === "outlinks" && link.source.id === currentNode.id)
        ) {
          if (!links.includes(link)) {
            links.push(link);
            traverseNeighbors(
              link.target.id === currentNode.id ? link.source : link.target,
              currentDepth + 1
            );
          }
        }
      });
    };

    traverseNeighbors(node, 0);

    const linkIndex = Link.createLinkIndex(links);

    return new Graph(nodes, links, nodeIndex, linkIndex);
  }

  // Clones the graph
  public clone = (): Graph => {
    return new Graph(
      structuredClone(this.nodes),
      structuredClone(this.links),
      structuredClone(this.nodeIndex),
      structuredClone(this.linkIndex)
    );
  };

  public static createEmpty = (): Graph => {
    return new Graph([], [], new Map(), new Map());
  };

  // Creates a graph using the Obsidian API
  public static createFromApp = (app: App): Graph => {
    const [nodes, nodeIndex] = Node.createFromFiles(app.vault.getFiles()),
      [links, linkIndex] = Link.createFromCache(app.metadataCache.resolvedLinks, nodes, nodeIndex);
    return new Graph(nodes, links, nodeIndex, linkIndex);
  };

  public static createFromFiles = (files: TAbstractFile[], app: App): Graph => {
    const [nodes, nodeIndex] = Node.createFromFiles(files),
      [links, linkIndex] = Link.createFromCache(app.metadataCache.resolvedLinks, nodes, nodeIndex);
    const tempGraph = new Graph(nodes, links, nodeIndex, linkIndex);
    // const tempGraph = Graph.createFromApp(app);
    // since the nodes are from the files, they are already correct.
    // we just need to update the links, we can pass into Boolean as the predicate
    return tempGraph.filter(Boolean);
  };

  // updates this graph with new data from the Obsidian API
  public update = (app: App) => {
    const newGraph = Graph.createFromApp(app);

    this.nodes.splice(0, this.nodes.length, ...newGraph.nodes);
    this.links.splice(0, this.links.length, ...newGraph.links);

    this.nodeIndex.clear();
    newGraph.nodeIndex.forEach((value, key) => {
      this.nodeIndex.set(key, value);
    });

    this.linkIndex.clear();
    newGraph.linkIndex.forEach((value, key) => {
      this.linkIndex.set(key, value);
    });
  };

  /**
   * filter the nodes of the graph, the links will be filtered automatically.
   * @param predicate what nodes to keep
   * @param graph the graph to filter
   * @returns a new graph
   */
  public filter = (predicate: (node: Node) => boolean) => {
    const filteredNodes = this.nodes.filter(predicate);
    const filteredLinks = this.links.filter((link) => {
      // the source and target nodes of a link must be in the filtered nodes
      return (
        filteredNodes.some((node) => link.source.id === node.id) &&
        filteredNodes.some((node) => link.target.id === node.id)
      );
    });

    // now reassign the links to nodes because the links are filtered
    filteredNodes.forEach((node) => {
      // clear the links of the node
      node.links.splice(0, node.links.length);

      // clear the neighbors of the node
      node.neighbors.splice(0, node.neighbors.length);

      // add back the neighbors to node
      filteredLinks.forEach((link) => {
        // if the link is connected to the node
        if (link.source.id === node.id || link.target.id === node.id) {
          // add the neighbor to the node
          node.addNeighbor(link.source.id === node.id ? link.target : link.source);
        }
      });
    });

    const nodeIndex = new Map<string, number>();
    filteredNodes.forEach((node, index) => {
      nodeIndex.set(node.id, index);
    });

    const linkIndex = Link.createLinkIndex(filteredLinks);

    return new Graph(filteredNodes, filteredLinks, nodeIndex, linkIndex);
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
