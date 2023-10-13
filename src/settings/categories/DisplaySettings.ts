const DEFAULT_NODE_SIZE = 3;
const DEFAULT_LINK_THICKNESS = 3;
const DEFAULT_LINK_DISTANCE = 50;

export const nodeSize = {
  min: 1,
  max: 5,
  step: 0.1,
  default: DEFAULT_NODE_SIZE, // 3
};

export const linkThickness = {
  min: 1,
  max: 5,
  step: 0.1,
  default: DEFAULT_LINK_THICKNESS, // 3
};

export const linkDistance = {
  min: 10,
  max: 100,
  step: 1,
  default: DEFAULT_LINK_DISTANCE, // 50
};

const DEFAULT_NODE_HOVER_COLOR = "#FF0000";
const DEFAULT_NODE_HOVER_NEIGHBOUR_COLOR = "#00FF00";
const DEFAULT_LINK_HOVER_COLOR = "#0000FF";
const DEFAULT_SHOW_EXTENSION = false;
const DEFAULT_SHOW_FULL_PATH = false;
export class DisplaySettings {
  public nodeSize = DEFAULT_NODE_SIZE;
  public linkThickness = DEFAULT_LINK_THICKNESS;
  public linkDistance = DEFAULT_LINK_DISTANCE;
  public nodeHoverColor = DEFAULT_NODE_HOVER_COLOR;
  public nodeHoverNeighbourColor = DEFAULT_NODE_HOVER_NEIGHBOUR_COLOR;
  public linkHoverColor = DEFAULT_LINK_HOVER_COLOR;
  public showExtension = DEFAULT_SHOW_EXTENSION;
  public showFullPath = DEFAULT_SHOW_FULL_PATH;

  constructor(
    nodeSize = DEFAULT_NODE_SIZE,
    linkThickness = DEFAULT_LINK_THICKNESS,
    linkDistance = DEFAULT_LINK_DISTANCE,
    nodeHoverColor = DEFAULT_NODE_HOVER_COLOR,
    nodeHoverNeighbourColor = DEFAULT_NODE_HOVER_NEIGHBOUR_COLOR,
    linkHoverColor = DEFAULT_LINK_HOVER_COLOR,
    showExtension = DEFAULT_SHOW_EXTENSION,
    showFullPath = DEFAULT_SHOW_FULL_PATH
  ) {
    this.nodeSize = nodeSize;
    this.linkThickness = linkThickness;
    this.linkDistance = linkDistance;
    this.nodeHoverColor = nodeHoverColor;
    this.nodeHoverNeighbourColor = nodeHoverNeighbourColor;
    this.linkHoverColor = linkHoverColor;
    this.showExtension = showExtension;
    this.showFullPath = showFullPath;
  }

  public toObject() {
    return {
      nodeSize: this.nodeSize,
      linkThickness: this.linkThickness,
      linkDistance: this.linkDistance,
      nodeHoverColor: this.nodeHoverColor,
      nodeHoverNeighbourColor: this.nodeHoverNeighbourColor,
      linkHoverColor: this.linkHoverColor,
      showExtension: this.showExtension,
      showFullPath: this.showFullPath,
    };
  }
}
