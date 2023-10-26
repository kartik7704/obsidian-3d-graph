import * as TWEEN from "@tweenjs/tween.js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Node } from "@/graph/Node";
import { NewForceGraph } from "@/views/graph/NewForceGraph";

const cameraLookAtCenterTransitionDuration = 1000;
const FOCAL_FROM_CAMERA = 400;
const selectedColor = "#CCA700";

/**
 * this instance handle all the interaction. In other words, the interaction manager
 */
export class ForceGraphEngine {
  private forceGraph: NewForceGraph;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tween: { [tweenId: string]: TWEEN.Tween<any> | undefined } = {};
  private spaceDown = false;
  private commandDown = false;
  private selectedNodes = new Set<Node>();
  /**
   * the node connected to the hover node
   */
  private readonly highlightedNodes: Set<string> = new Set();
  hoveredNode: Node | null;

  constructor(forceGraph: NewForceGraph) {
    this.forceGraph = forceGraph;
    this.initListeners();
  }

  initListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        this.spaceDown = true;
        // this.controls.mouseButtons.LEFT = THREE.MOUSE.RIGHT;
      }
      if (e.metaKey) this.commandDown = true;
    });

    document.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this.spaceDown = false;
        // this.controls.mouseButtons.LEFT = THREE.MOUSE.LEFT;
      }
      if (!e.metaKey) this.commandDown = false;
    });
  }

  /**
   *
   * if the input is undefined, return the current camera position. else this will move the camera to a specific position.
   */
  public cameraPosition(
    position: Partial<Coords> | undefined,
    lookAt: Coords | undefined,
    transitionDuration: number | undefined
  ) {
    const instance = this.forceGraph.instance;
    const camera = instance.camera();
    const controls = instance.controls() as OrbitControls;
    const tween = this.tween;
    if (position === undefined && lookAt === undefined && transitionDuration === undefined) {
      return {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
    }

    if (position) {
      const finalPos = position;
      const finalLookAt = lookAt || { x: 0, y: 0, z: 0 };

      if (!transitionDuration) {
        // no animation

        setCameraPos(finalPos);
        setLookAt(finalLookAt);
      } else {
        const camPos = Object.assign({}, camera.position);
        const camLookAt = getLookAt();

        // create unique id for position tween
        const posTweenId = Math.random().toString(36).substring(2, 15);

        tween[posTweenId] = new TWEEN.Tween(camPos)
          .to(finalPos, transitionDuration)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(setCameraPos)
          .onComplete(() => {
            tween[posTweenId] = undefined;
          })
          .start();

        // create unique id for lookAt tween
        const lookAtTweenId = Math.random().toString(36).substring(2, 15);

        // Face direction in 1/3rd of time
        tween[lookAtTweenId] = new TWEEN.Tween(camLookAt)
          .to(finalLookAt, transitionDuration / 3)
          .easing(TWEEN.Easing.Quadratic.Out)
          .onUpdate(setLookAt)
          .onComplete(() => {
            tween[lookAtTweenId] = undefined;
          })
          .start();
      }

      // eslint-disable-next-line no-inner-declarations
      function setCameraPos(pos: Partial<Coords>) {
        const { x, y, z } = pos;
        if (x !== undefined) camera.position.x = x;
        if (y !== undefined) camera.position.y = y;
        if (z !== undefined) camera.position.z = z;
      }

      // eslint-disable-next-line no-inner-declarations
      function setLookAt(lookAt: Coords) {
        const lookAtVect = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
        if (controls.target) {
          controls.target = lookAtVect;
        } else {
          // Fly controls doesn't have target attribute
          camera.lookAt(lookAtVect); // note: lookAt may be overridden by other controls in some cases
        }
      }

      // eslint-disable-next-line no-inner-declarations
      function getLookAt() {
        return Object.assign(
          new THREE.Vector3(0, 0, -1000).applyQuaternion(camera.quaternion).add(camera.position)
        );
      }
    }
  }

  /**
   * this will force the camera to look at a specific position
   * @param lookAt
   * @param transitionDuration
   */
  public cameraLookAt(lookAt: Coords, transitionDuration: number | undefined) {
    this.cameraPosition(undefined, lookAt, transitionDuration);
  }

  /**
   * this will force the camera to look at the center of the graph
   */
  public cameraLookAtCenter = () => {
    const cameraPosition = this.forceGraph.instance.camera().position;
    this.cameraPosition(cameraPosition, { x: 0, y: 0, z: 0 }, cameraLookAtCenterTransitionDuration);
  };

  public focusOnNodeByPath = (path: string) => {
    // TODO: test if this is right
    const node = (this.forceGraph.instance.graphData().nodes as (Node & Coords)[]).find(
      (n) => n.path === path
    );
    if (node) {
      this.focusOnCoords(node, 1000);
    }
  };

  public focusOnCoords = (coords: Coords, duration = 3000) => {
    // Aim at node from outside it
    const distance = FOCAL_FROM_CAMERA;
    const distRatio = 1 + distance / Math.hypot(coords.x, coords.y, coords.z);

    const newPos =
      coords.x || coords.y || coords.z
        ? { x: coords.x * distRatio, y: coords.y * distRatio, z: coords.z * distRatio }
        : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

    this.forceGraph.instance.cameraPosition(
      newPos, // new position
      coords, // lookAt ({ x, y, z })
      duration // ms transition duration
    );
  };

  public isHighlightedNode = (node: Node): boolean => {
    return this.highlightedNodes.has(node.id);
  };

  public getNodeColor = (node: Node): string => {
    const settings = this.forceGraph.view.settingManager.getCurrentSetting();
    const theme = this.forceGraph.view.plugin.theme;
    const searchResult = this.forceGraph.view.settingManager.searchResult;
    if (this.selectedNodes.has(node)) {
      return selectedColor;
    }
    if (this.isHighlightedNode(node)) {
      return node === this.hoveredNode
        ? settings.display.nodeHoverColor
        : settings.display.nodeHoverNeighbourColor;
    } else {
      let color = theme.textMuted;
      settings.groups
        // we only want to use the groups that have a query
        .filter((g) => g.query.trim().length !== 0)
        .forEach((group, index) => {
          const searchStateGroup = searchResult.value.groups[index]!;
          const searchGroupfilePaths = searchStateGroup.files.map((file) => file.path);

          // if the node path is in the searchGroupfiles, change the color to group.color
          if (searchGroupfilePaths.includes(node.path)) color = group.color;
        });
      return color;
    }
  };
}
