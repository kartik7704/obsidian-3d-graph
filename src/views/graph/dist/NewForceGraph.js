"use strict";
exports.__esModule = true;
exports.NewForceGraph = exports.origin = void 0;
var _3d_force_graph_1 = require("3d-force-graph");
var Graph_1 = require("@/graph/Graph");
var CenterCoordinates_1 = require("@/views/graph/CenterCoordinates");
var THREE = require("three");
var d3 = require("d3-force-3d");
var hexToRGBA_1 = require("@/util/hexToRGBA");
var CSS2DRenderer_js_1 = require("three/examples/jsm/renderers/CSS2DRenderer.js");
var ForceGraphEngine_1 = require("@/views/graph/ForceGraphEngine");
var polished_1 = require("polished");
/**
 * the origin vectorss
 */
exports.origin = new THREE.Vector3(0, 0, 0);
/**
 * this class control the config and graph of the force graph. The interaction is not control here.
 */
var NewForceGraph = /** @class */ (function () {
    /**
     *
     * this will create a new force graph instance and render it to the view
     * @param view
     * @param config you have to provide the full config here!!
     */
    function NewForceGraph(view, graph) {
        var _this = this;
        var _a;
        /**
         * given the changed things, update the instance
         */
        this.updateInstance = function (graph, config) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
            if (graph !== undefined)
                _this.instance.graphData(graph);
            if (((_a = config === null || config === void 0 ? void 0 : config.display) === null || _a === void 0 ? void 0 : _a.nodeSize) !== undefined)
                _this.instance.nodeRelSize((_b = config.display) === null || _b === void 0 ? void 0 : _b.nodeSize);
            if (((_c = config === null || config === void 0 ? void 0 : config.display) === null || _c === void 0 ? void 0 : _c.linkDistance) !== undefined) {
                (_d = _this.instance.d3Force("link")) === null || _d === void 0 ? void 0 : _d.distance((_e = config.display) === null || _e === void 0 ? void 0 : _e.linkDistance);
            }
            if (((_f = config === null || config === void 0 ? void 0 : config.display) === null || _f === void 0 ? void 0 : _f.nodeRepulsion) !== undefined) {
                (_g = _this.instance.d3Force("charge")) === null || _g === void 0 ? void 0 : _g.strength(-((_h = config.display) === null || _h === void 0 ? void 0 : _h.nodeRepulsion));
                _this.instance
                    .d3Force("x", d3.forceX(0).strength(1 - ((_j = config.display) === null || _j === void 0 ? void 0 : _j.nodeRepulsion) / 3000 + 0.001))
                    .d3Force("y", d3.forceY(0).strength(1 - ((_k = config.display) === null || _k === void 0 ? void 0 : _k.nodeRepulsion) / 3000 + 0.001))
                    .d3Force("z", d3.forceZ(0).strength(1 - ((_l = config.display) === null || _l === void 0 ? void 0 : _l.nodeRepulsion) / 3000 + 0.001));
            }
            if (((_m = config === null || config === void 0 ? void 0 : config.display) === null || _m === void 0 ? void 0 : _m.showCenterCoordinates) !== undefined) {
                _this.centerCoordinates.setVisibility(config.display.showCenterCoordinates);
            }
            if (((_p = (_o = config) === null || _o === void 0 ? void 0 : _o.display) === null || _p === void 0 ? void 0 : _p.dagOrientation) !== undefined) {
                // @ts-ignore
                var noDag = (config === null || config === void 0 ? void 0 : config.display.dagOrientation) === "null";
                // @ts-ignore
                _this.instance.dagMode(noDag ? null : config === null || config === void 0 ? void 0 : config.display.dagOrientation).dagLevelDistance(75);
            }
            /**
             * derive the need to reheat the simulation
             */
            var needReheat = ((_q = config === null || config === void 0 ? void 0 : config.display) === null || _q === void 0 ? void 0 : _q.nodeRepulsion) !== undefined ||
                ((_r = config === null || config === void 0 ? void 0 : config.display) === null || _r === void 0 ? void 0 : _r.linkDistance) !== undefined ||
                ((_t = (_s = config) === null || _s === void 0 ? void 0 : _s.display) === null || _t === void 0 ? void 0 : _t.dagOrientation) !== undefined;
            if (needReheat) {
                _this.instance.numDimensions(3); // reheat simulation
                _this.instance.refresh();
            }
        };
        this.view = view;
        this.interactionManager = new ForceGraphEngine_1.ForceGraphEngine(this);
        // get the content element of the item view
        var rootHtmlElement = view.contentEl;
        // create the div element for the node label
        var divEl = this.createNodeLabel();
        // create the instance
        // these config will not changed by user
        this.instance = _3d_force_graph_1["default"]({
            controlType: "orbit",
            extraRenderers: [
                // @ts-ignore https://github.com/vasturiano/3d-force-graph/blob/522d19a831e92015ff77fb18574c6b79acfc89ba/example/html-nodes/index.html#L27C9-L29
                new CSS2DRenderer_js_1.CSS2DRenderer({
                    element: divEl
                }),
            ]
        })(rootHtmlElement)
            .graphData(graph)
            .nodeColor(this.interactionManager.getNodeColor)
            // @ts-ignore
            .nodeLabel(function (node) { return null; })
            // node size is proportional to the number of links
            .nodeVal(function (node) {
            return node.links.length;
        })
            .nodeOpacity(0.9)
            .linkOpacity(0.3)
            .onNodeHover(this.interactionManager.onNodeHover)
            .onNodeDrag(this.interactionManager.onNodeDrag)
            .onNodeDragEnd(this.interactionManager.onNodeDragEnd)
            .onNodeRightClick(this.interactionManager.onNodeRightClick)
            .onNodeClick(this.interactionManager.onNodeClick)
            .onLinkHover(this.interactionManager.onLinkHover)
            .linkColor(this.interactionManager.getLinkColor)
            .linkWidth(this.interactionManager.getLinkWidth)
            .linkDirectionalParticles(this.interactionManager.getLinkDirectionalParticles)
            .linkDirectionalParticleWidth(this.interactionManager.getLinkDirectionalParticleWidth)
            .linkDirectionalArrowLength(this.interactionManager.getLinkDirectionalArrowLength)
            .linkDirectionalArrowRelPos(1)
            // the options here are auto
            .width(rootHtmlElement.innerWidth)
            .height(rootHtmlElement.innerHeight)
            .d3Force("collide", d3.forceCollide(5))
            //   transparent
            .backgroundColor(hexToRGBA_1.hexToRGBA("#000000", 0));
        var scene = this.instance.scene();
        var renderer = this.instance.renderer();
        renderer.domElement.addEventListener("wheel", function (e) { return _this.interactionManager.onZoom(e); });
        // add others things
        // add center coordinates
        this.centerCoordinates = new CenterCoordinates_1.CenterCoordinates(this.view.settingManager.getCurrentSetting().display.showCenterCoordinates);
        scene.add(this.centerCoordinates.arrowsGroup);
        this.myCube = this.createCube();
        scene.add(this.myCube);
        // add node label
        this.instance
            .nodeThreeObject(function (node) {
            var nodeEl = document.createElement("div");
            var text = _this.interactionManager.getNodeLabelText(node);
            nodeEl.textContent = text;
            // @ts-ignore
            nodeEl.style.color = node.color;
            nodeEl.className = "node-label";
            nodeEl.style.top = "20px";
            nodeEl.style.fontSize = "12px";
            nodeEl.style.padding = "1px 4px";
            nodeEl.style.borderRadius = "4px";
            nodeEl.style.backgroundColor = polished_1.rgba(0, 0, 0, 0.5);
            nodeEl.style.userSelect = "none";
            var cssObject = new CSS2DRenderer_js_1.CSS2DObject(nodeEl);
            cssObject.onAfterRender = function (renderer, scene, camera) {
                var value = 1 - _this.interactionManager.getNodeOpacityEasedValue(node);
                nodeEl.style.opacity = "" + (_this.interactionManager.getIsAnyHighlighted() &&
                    !_this.interactionManager.isHighlightedNode(node)
                    ? Math.clamp(value, 0, 0.2)
                    : _this.interactionManager.hoveredNode === node
                        ? 1
                        : value);
            };
            return cssObject;
        })
            .nodeThreeObjectExtend(true);
        // init other setting
        this.updateConfig(this.view.settingManager.getCurrentSetting());
        var controls = this.instance.controls();
        controls.mouseButtons.RIGHT = undefined;
        //  change the nav info text
        (_a = this.view.contentEl
            .querySelector(".scene-nav-info")) === null || _a === void 0 ? void 0 : _a.setText("Left-click: rotate, Mouse-wheel/middle-click: zoom, Cmd + left-click: pan");
    }
    NewForceGraph.prototype.createNodeLabel = function () {
        var divEl = document.createElement("div");
        divEl.style.zIndex = "0";
        this.nodeLabelEl = divEl.createDiv({
            cls: "node-label",
            text: ""
        });
        this.nodeLabelEl.style.opacity = "0";
        return divEl;
    };
    NewForceGraph.prototype.createCube = function () {
        // add cube
        var myCube = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        myCube.position.set(0, 0, -ForceGraphEngine_1.FOCAL_FROM_CAMERA);
        var oldOnBeforeRender = this.instance.scene().onBeforeRender;
        this.instance.scene().onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
            // first run the old onBeforeRender
            oldOnBeforeRender(renderer, scene, camera, geometry, material, group);
            var cwd = new THREE.Vector3();
            camera.getWorldDirection(cwd);
            cwd.multiplyScalar(ForceGraphEngine_1.FOCAL_FROM_CAMERA);
            cwd.add(camera.position);
            myCube.position.set(cwd.x, cwd.y, cwd.z);
            myCube.setRotationFromQuaternion(camera.quaternion);
        };
        myCube.visible = false;
        return myCube;
    };
    /**
     * update the dimensions of the graph
     */
    NewForceGraph.prototype.updateDimensions = function () {
        var rootHtmlElement = this.view.contentEl;
        var _a = [rootHtmlElement.offsetWidth, rootHtmlElement.offsetHeight], width = _a[0], height = _a[1];
        this.instance.width(width).height(height);
    };
    NewForceGraph.prototype.updateConfig = function (config) {
        this.updateInstance(undefined, config);
    };
    /**
     * given a new force Graph, the update the graph and the instance
     */
    NewForceGraph.prototype.updateGraph = function (graph) {
        // some optimization here
        // if the graph is the same, then we don't need to update the graph
        var same = Graph_1.Graph.compare(this.instance.graphData(), graph);
        if (!same)
            this.updateInstance(graph, undefined);
        else
            console.log("same graph, no need to update");
    };
    return NewForceGraph;
}());
exports.NewForceGraph = NewForceGraph;
