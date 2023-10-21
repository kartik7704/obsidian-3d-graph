import { Node } from "@/graph/Node";

export type ResolvedLinkCache = Record<string, Record<string, number>>;

export class Link {
  public readonly source: Node;
  public readonly target: Node;

  constructor(source: Node, target: Node) {
    this.source = source;
    this.target = target;
  }

  /**
   * Creates a link index for an array of links
   * @param links
   * @returns
   */
  static createLinkIndex(links: Link[]): Map<string, Map<string, number>> {
    const linkIndex = new Map<string, Map<string, number>>();
    links.forEach((link, index) => {
      if (!linkIndex.has(link.source.id)) {
        linkIndex.set(link.source.id, new Map<string, number>());
      }
      linkIndex.get(link.source.id)?.set(link.target.id, index);
    });

    return linkIndex;
  }

  /**
   * Creates an array of links + index from an array of nodes and the Obsidian API cache
   *
   * @param cache the Obsidian API cache
   * @param nodes the array of nodes
   * @param nodeIndex the index of the nodes
   * @returns an array of links and an index of the links
   */
  static createFromCache(
    cache: ResolvedLinkCache,
    nodes: Node[],
    nodeIndex: Map<string, number>
  ): [Link[], Map<string, Map<string, number>>] {
    const links = Object.keys(cache)
      .map((node1Id) => {
        // @ts-ignore
        return Object.keys(cache[node1Id])
          .map((node2Id) => {
            const [node1Index, node2Index] = [nodeIndex.get(node1Id), nodeIndex.get(node2Id)];
            if (node1Index !== undefined && node2Index !== undefined) {
              // @ts-ignore
              return nodes[node1Index].addNeighbor(
                // @ts-ignore
                nodes[node2Index]
              );
            }
            return null;
          })
          .flat();
      })
      .flat()
      // remove duplicates and nulls
      .filter(
        (link, index, self) =>
          link &&
          link.source !== link.target &&
          index ===
            self.findIndex(
              (l: Link | null) => l && l.source === link.source && l.target === link.target
            )
      ) as Link[];

    return [links, Link.createLinkIndex(links)];
  }
}
