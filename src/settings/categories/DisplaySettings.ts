const DEFAULT_NODE_SIZE = 3;
const DEFAULT_LINK_THICKNESS = 3;
const DEFAULT_LINK_DISTANCE = 100;
const DEFAULT_NODE_REPULSION = 25;

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
  max: 200,
  step: 1,
  default: DEFAULT_LINK_DISTANCE, // 50
};

export const nodeRepulsion = {
  min: 10,
  max: 100,
  step: 1,
  default: DEFAULT_NODE_REPULSION, // 25
};

// 'td', 'bu', 'lr', 'rl', 'zout', 'zin', 'radialout', 'radialin', null
export type DagOrientation =
  | "td"
  | "bu"
  | "lr"
  | "rl"
  | "zout"
  | "zin"
  | "radialout"
  | "radialin"
  | "null";

const DEFAULT_NODE_HOVER_COLOR = "#FF0000";
const DEFAULT_NODE_HOVER_NEIGHBOUR_COLOR = "#00FF00";
const DEFAULT_LINK_HOVER_COLOR = "#0000FF";
const DEFAULT_SHOW_EXTENSION = false;
const DEFAULT_SHOW_FULL_PATH = false;
const DEFAULT_DAG_ORIENTATION = "null" as DagOrientation;
const DEFAULT_SHOW_CENTER_COORDINATES = false;
const DEFAULT_SHOW_LINK_ARROW = true;
export class DisplaySettings {
  public nodeSize = DEFAULT_NODE_SIZE;
  public linkThickness = DEFAULT_LINK_THICKNESS;
  public linkDistance = DEFAULT_LINK_DISTANCE;
  public nodeHoverColor = DEFAULT_NODE_HOVER_COLOR;
  public nodeHoverNeighbourColor = DEFAULT_NODE_HOVER_NEIGHBOUR_COLOR;
  public nodeRepulsion = DEFAULT_NODE_REPULSION;
  public linkHoverColor = DEFAULT_LINK_HOVER_COLOR;
  public showExtension = DEFAULT_SHOW_EXTENSION;
  public showFullPath = DEFAULT_SHOW_FULL_PATH;
  public dagOrientation = DEFAULT_DAG_ORIENTATION;
  public showCenterCoordinates = DEFAULT_SHOW_CENTER_COORDINATES;
  public showLinkArrow = DEFAULT_SHOW_LINK_ARROW;

  constructor({
    nodeSize = DEFAULT_NODE_SIZE,
    linkThickness = DEFAULT_LINK_THICKNESS,
    linkDistance = DEFAULT_LINK_DISTANCE,
    nodeHoverColor = DEFAULT_NODE_HOVER_COLOR,
    nodeHoverNeighbourColor = DEFAULT_NODE_HOVER_NEIGHBOUR_COLOR,
    linkHoverColor = DEFAULT_LINK_HOVER_COLOR,
    showExtension = DEFAULT_SHOW_EXTENSION,
    showFullPath = DEFAULT_SHOW_FULL_PATH,
    dagOrientation = DEFAULT_DAG_ORIENTATION,
    nodeRepulsion = DEFAULT_NODE_REPULSION,
    showCenterCoordinates = DEFAULT_SHOW_CENTER_COORDINATES,
    showLinkArrow = DEFAULT_SHOW_LINK_ARROW,
  }: {
    nodeSize?: number;
    linkThickness?: number;
    linkDistance?: number;
    nodeHoverColor?: string;
    nodeHoverNeighbourColor?: string;
    linkHoverColor?: string;
    showExtension?: boolean;
    showFullPath?: boolean;
    dagOrientation?: DagOrientation;
    nodeRepulsion?: number;
    showCenterCoordinates?: boolean;
    showLinkArrow?: boolean;
  } = {}) {
    this.nodeSize = nodeSize;
    this.linkThickness = linkThickness;
    this.linkDistance = linkDistance;
    this.nodeHoverColor = nodeHoverColor;
    this.nodeHoverNeighbourColor = nodeHoverNeighbourColor;
    this.nodeRepulsion = nodeRepulsion;
    this.linkHoverColor = linkHoverColor;
    this.showExtension = showExtension;
    this.showFullPath = showFullPath;
    this.dagOrientation = dagOrientation;
    this.showCenterCoordinates = showCenterCoordinates;
    this.showLinkArrow = showLinkArrow;
  }

  public toObject() {
    const { toObject: _, ...others } = this;
    return {
      ...others,
    };
  }
}
