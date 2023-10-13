const DEFAULT_NODE_SIZE = 4;
const DEFAULT_LINK_THICKNESS = 1;
const DEFAULT_LINK_DISTANCE = 10;

export class DisplaySettings {
  public nodeSize = DEFAULT_NODE_SIZE;
  public linkThickness = DEFAULT_LINK_THICKNESS;
  public linkDistance = DEFAULT_LINK_DISTANCE;

  constructor(
    nodeSize = DEFAULT_NODE_SIZE,
    linkThickness = DEFAULT_LINK_THICKNESS,
    linkDistance = DEFAULT_LINK_DISTANCE
  ) {
    this.nodeSize = nodeSize;
    this.linkThickness = linkThickness;
    this.linkDistance = linkDistance;
  }

  public toObject() {
    return {
      nodeSize: this.nodeSize,
      linkThickness: this.linkThickness,
    };
  }
}
