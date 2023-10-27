"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.ForceGraphEngine = exports.FOCAL_FROM_CAMERA = void 0;
var TWEEN = require("@tweenjs/tween.js");
var THREE = require("three");
var CommandModal_1 = require("@/commands/CommandModal");
var SettingsSchemas_1 = require("@/SettingsSchemas");
var createNotice_1 = require("@/util/createNotice");
var hexToRGBA_1 = require("@/util/hexToRGBA");
var origin = new THREE.Vector3(0, 0, 0);
var cameraLookAtCenterTransitionDuration = 1000;
var LINK_PARTICLE_MULTIPLIER = 2;
exports.FOCAL_FROM_CAMERA = 400;
var selectedColor = "#CCA700";
var PARTICLE_FREQUECY = 4;
var LINK_ARROW_WIDTH_MULTIPLIER = 5;
var DISTANCE_FROM_FOCAL = 300;
/**
 * this instance handle all the interaction. In other words, the interaction manager
 */
var ForceGraphEngine = /** @class */ (function () {
    function ForceGraphEngine(forceGraph) {
        var _this = this;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.tween = {};
        this.spaceDown = false;
        this.commandDown = false;
        this.selectedNodes = new Set();
        /**
         * the node connected to the hover node
         */
        this.highlightedNodes = new Set();
        /**
         * the links connected to the hover node
         */
        this.highlightedLinks = new Set();
        // zooming
        this.isZooming = false;
        this.onZoomStart = function () {
            var tweens = Object.keys(_this.tween);
            if (tweens) {
                Object.values(_this.tween).forEach(function (tween) {
                    if (tween) {
                        tween.stop();
                    }
                });
                // remove the tween
                _this.tween = {};
            }
        };
        this.onNodeDrag = function (node, translate) {
            // https://github.com/vasturiano/3d-force-graph/issues/279#issuecomment-587135032
            if (_this.forceGraph.view.settingManager.getCurrentSetting().display.dontMoveWhenDrag)
                _this.forceGraph.instance.cooldownTicks(0);
            if (_this.selectedNodes.has(node)) {
                // moving a selected node
                __spreadArrays(_this.selectedNodes).filter(function (selNode) { return selNode !== node; }) // don't touch node being dragged
                    .forEach(function (node) {
                    return ["x", "y", "z"].forEach(
                    // @ts-ignore
                    function (coord) { return (node["f" + coord] = node[coord] + translate[coord]); });
                }); // translate other nodes by same amount
            }
        };
        this.onNodeDragEnd = function (node) {
            var setting = _this.forceGraph.view.settingManager.getCurrentSetting();
            // https://github.com/vasturiano/3d-force-graph/issues/279#issuecomment-587135032
            if (setting.display.dontMoveWhenDrag)
                _this.forceGraph.instance.cooldownTicks(Infinity);
            if (_this.selectedNodes.has(node)) {
                // finished moving a selected node
                __spreadArrays(_this.selectedNodes).filter(function (selNode) { return selNode !== node; }) // don't touch node being dragged
                    // @ts-ignore
                    .forEach(function (node) { return ["x", "y", "z"].forEach(function (coord) { return (node["f" + coord] = undefined); }); }); // unfix controlled nodes
            }
        };
        this.onNodeRightClick = function (node, mouseEvent) {
            if (!_this.selectedNodes.has(node)) {
                _this.selectedNodes.clear();
                _this.selectedNodes.add(node);
            }
            //   show a modal
            var modal = new CommandModal_1.CommandModal(_this.forceGraph.view, _this.selectedNodes);
            var promptEl = modal.containerEl.querySelector(".prompt");
            var dv = promptEl === null || promptEl === void 0 ? void 0 : promptEl.createDiv({
                text: "Commands will be run for " + _this.selectedNodes.size + " nodes."
            });
            dv === null || dv === void 0 ? void 0 : dv.setAttribute("style", "padding: var(--size-4-3); font-size: var(--font-smaller);");
            modal.open();
        };
        this.onNodeClick = function (node, event) {
            var plugin = _this.forceGraph.view.plugin;
            if (event.shiftKey) {
                var isSelected = _this.selectedNodes.has(node);
                // multi-selection
                isSelected ? _this.selectedNodes["delete"](node) : _this.selectedNodes.add(node);
                return;
            }
            if (_this.commandDown || event.ctrlKey) {
                _this.focusOnCoords(node);
                return;
            }
            var clickedNodeFile = plugin.app.vault.getFiles().find(function (f) { return f.path === node.path; });
            if (clickedNodeFile) {
                if (_this.forceGraph.view.graphType === SettingsSchemas_1.GraphType.local) {
                    plugin.app.workspace.getLeaf(false).openFile(clickedNodeFile);
                }
                else {
                    _this.forceGraph.view.leaf.openFile(clickedNodeFile);
                }
            }
        };
        this.onNodeHover = function (node) {
            if ((!node && !_this.highlightedNodes.size) || (node && _this.hoveredNode === node))
                return;
            // set node label text
            if (node) {
                var text = _this.getNodeLabelText(node);
                _this.forceGraph.nodeLabelEl.textContent = text;
                // @ts-ignore
                _this.forceGraph.nodeLabelEl.style.color = node.color;
                _this.forceGraph.nodeLabelEl.style.opacity = "1";
            }
            else {
                _this.forceGraph.nodeLabelEl.style.opacity = "0";
            }
            _this.clearHighlights();
            if (node) {
                _this.highlightedNodes.add(node.id);
                node.neighbors.forEach(function (neighbor) { return _this.highlightedNodes.add(neighbor.id); });
                var nodeLinks = _this.forceGraph.instance.graphData().getLinksWithNode(node.id);
                if (nodeLinks)
                    nodeLinks.forEach(function (link) { return _this.highlightedLinks.add(link); });
            }
            _this.hoveredNode = node !== null && node !== void 0 ? node : null;
            _this.updateColor();
        };
        this.clearHighlights = function () {
            _this.highlightedNodes.clear();
            _this.highlightedLinks.clear();
        };
        this.getLinkColor = function (link) {
            var color = _this.isHighlightedLink(link)
                ? _this.forceGraph.view.settingManager.getCurrentSetting().display.linkHoverColor
                : _this.forceGraph.view.plugin.theme.textMuted;
            return hexToRGBA_1.hexToRGBA(color, _this.getIsAnyHighlighted() && !_this.isHighlightedLink(link) ? 0.2 : 1);
        };
        this.getLinkWidth = function (link) {
            var setting = _this.forceGraph.view.settingManager.getCurrentSetting();
            return _this.isHighlightedLink(link)
                ? setting.display.linkThickness * 1.5
                : setting.display.linkThickness;
        };
        this.getLinkDirectionalParticles = function (link) {
            return _this.isHighlightedLink(link) ? PARTICLE_FREQUECY : 0;
        };
        this.getLinkDirectionalParticleWidth = function () {
            var setting = _this.forceGraph.view.settingManager.getCurrentSetting();
            return setting.display.linkThickness * LINK_PARTICLE_MULTIPLIER;
        };
        this.onLinkHover = function (link) {
            _this.clearHighlights();
            if (link) {
                _this.highlightedLinks.add(link);
                _this.highlightedNodes.add(link.source.id);
                _this.highlightedNodes.add(link.target.id);
            }
            _this.updateColor();
        };
        this.getNodeOpacityEasedValue = function (node) {
            // get the position of the node
            // @ts-ignore
            var obj = node.__threeObj;
            if (!obj)
                return 0;
            var nodePosition = obj.position;
            // then get the distance between the node and this.myCube , console.log it
            var distance = nodePosition.distanceTo(_this.forceGraph.myCube.position);
            // change the opacity of the nodeEl base on the distance
            // the higher the distance, the lower the opacity
            // when the distance is 300, the opacity is 0
            var normalizedDistance = Math.min(distance, DISTANCE_FROM_FOCAL) / DISTANCE_FROM_FOCAL;
            var easedValue = 0.5 - 0.5 * Math.cos(normalizedDistance * Math.PI);
            return easedValue;
        };
        this.getLinkDirectionalArrowLength = function () {
            var settings = _this.forceGraph.view.settingManager.getCurrentSetting();
            return (settings.display.linkThickness *
                LINK_ARROW_WIDTH_MULTIPLIER *
                (settings.display.showLinkArrow ? 1 : 0));
        };
        this.isHighlightedLink = function (link) {
            return _this.highlightedLinks.has(link);
        };
        this.getNodeLabelText = function (node) {
            var settings = _this.forceGraph.view.settingManager.getCurrentSetting();
            var fullPath = node.path;
            var fileNameWithExtension = node.name;
            var fullPathWithoutExtension = fullPath.substring(0, fullPath.lastIndexOf("."));
            var fileNameWithoutExtension = fileNameWithExtension.substring(0, fileNameWithExtension.lastIndexOf("."));
            var text = !settings.display.showExtension
                ? settings.display.showFullPath
                    ? fullPathWithoutExtension
                    : fileNameWithoutExtension
                : settings.display.showFullPath
                    ? fullPath
                    : fileNameWithExtension;
            return text;
        };
        /**
         * this will force the camera to look at the center of the graph
         */
        this.cameraLookAtCenter = function () {
            var cameraPosition = _this.forceGraph.instance.camera().position;
            _this.cameraPosition(cameraPosition, { x: 0, y: 0, z: 0 }, cameraLookAtCenterTransitionDuration);
        };
        this.focusOnNodeByPath = function (path) {
            // TODO: test if this is right
            var node = _this.forceGraph.instance.graphData().nodes.find(function (n) { return n.path === path; });
            if (node) {
                _this.focusOnCoords(node, 1000);
            }
        };
        this.focusOnCoords = function (coords, duration) {
            if (duration === void 0) { duration = 3000; }
            // Aim at node from outside it
            var distance = exports.FOCAL_FROM_CAMERA;
            var distRatio = 1 + distance / Math.hypot(coords.x, coords.y, coords.z);
            var newPos = coords.x || coords.y || coords.z
                ? { x: coords.x * distRatio, y: coords.y * distRatio, z: coords.z * distRatio }
                : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)
            _this.cameraPosition(newPos, // new position
            coords, // lookAt ({ x, y, z })
            duration // ms transition duration
            );
        };
        this.isHighlightedNode = function (node) {
            return _this.highlightedNodes.has(node.id);
        };
        this.getNodeColor = function (node) {
            var color;
            var settings = _this.forceGraph.view.settingManager.getCurrentSetting();
            var theme = _this.forceGraph.view.plugin.theme;
            var searchResult = _this.forceGraph.view.settingManager.searchResult;
            if (_this.selectedNodes.has(node)) {
                color = selectedColor;
            }
            else if (_this.isHighlightedNode(node)) {
                color =
                    node === _this.hoveredNode
                        ? settings.display.nodeHoverColor
                        : settings.display.nodeHoverNeighbourColor;
            }
            else {
                color = theme.textMuted;
                settings.groups.forEach(function (group, index) {
                    if (group.query.trim().length === 0)
                        return;
                    var searchStateGroup = searchResult.value.groups[index];
                    var searchGroupfilePaths = searchStateGroup.files.map(function (file) { return file.path; });
                    // if the node path is in the searchGroupfiles, change the color to group.color
                    if (searchGroupfilePaths.includes(node.path))
                        color = group.color;
                });
            }
            var rgba = hexToRGBA_1.hexToRGBA(color, _this.getIsAnyHighlighted() && !_this.isHighlightedNode(node) ? 0.5 : 1);
            return rgba;
        };
        this.getIsAnyHighlighted = function () {
            return _this.highlightedNodes.size !== 0 || _this.highlightedLinks.size !== 0;
        };
        this.forceGraph = forceGraph;
        this.initListeners();
    }
    ForceGraphEngine.prototype.onZoom = function (event) {
        var _this = this;
        var camera = this.forceGraph.instance.camera();
        // check if it is start zooming using setTimeout
        // if it is, then cancel the animation
        if (!this.isZooming && !this.startZoomTimeout) {
            this.startZoomTimeout = setTimeout(function () {
                // console.log("this should only show once");
                if (!_this.isZooming) {
                    clearTimeout(_this.startZoomTimeout);
                    _this.startZoomTimeout = undefined;
                    _this.isZooming = true;
                    _this.onZoomStart();
                }
                return;
            }, 100);
        }
        var distanceToCenter = camera.position.distanceTo(origin);
        camera.updateProjectionMatrix();
        this.forceGraph.centerCoordinates.setLength(distanceToCenter / 10);
        if (this.isZooming) {
            clearTimeout(this.endZoomTimeout);
            this.endZoomTimeout = setTimeout(function () {
                _this.endZoomTimeout = undefined;
                _this.isZooming = false;
                _this.onZoomEnd();
            }, 100);
        }
    };
    ForceGraphEngine.prototype.onZoomEnd = function () { };
    ForceGraphEngine.prototype.updateNodeLabelDiv = function () {
        this.forceGraph.instance.nodeThreeObject(this.forceGraph.instance.nodeThreeObject());
    };
    /**
     * this will update the color of the nodes and links
     */
    ForceGraphEngine.prototype.updateColor = function () {
        // trigger update of highlighted objects in scene
        this.forceGraph.instance
            .nodeColor(this.forceGraph.instance.nodeColor())
            .linkColor(this.forceGraph.instance.linkColor())
            .linkDirectionalParticles(this.forceGraph.instance.linkDirectionalParticles());
    };
    ForceGraphEngine.prototype.initListeners = function () {
        var _this = this;
        document.addEventListener("keydown", function (e) {
            if (e.code === "Space") {
                _this.spaceDown = true;
                // this.controls.mouseButtons.LEFT = THREE.MOUSE.RIGHT;
            }
            if (e.metaKey)
                _this.commandDown = true;
        });
        document.addEventListener("keyup", function (e) {
            if (e.code === "Space") {
                _this.spaceDown = false;
                // this.controls.mouseButtons.LEFT = THREE.MOUSE.LEFT;
            }
            if (!e.metaKey)
                _this.commandDown = false;
        });
    };
    /**
     *
     * if the input is undefined, return the current camera position. else this will move the camera to a specific position.
     */
    ForceGraphEngine.prototype.cameraPosition = function (position, lookAt, transitionDuration) {
        var instance = this.forceGraph.instance;
        var camera = instance.camera();
        var controls = instance.controls();
        var tween = this.tween;
        if (position === undefined && lookAt === undefined && transitionDuration === undefined) {
            return {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            };
        }
        if (position) {
            var finalPos = position;
            var finalLookAt = lookAt || { x: 0, y: 0, z: 0 };
            if (!transitionDuration) {
                // no animation
                setCameraPos(finalPos);
                setLookAt(finalLookAt);
            }
            else {
                var camPos = Object.assign({}, camera.position);
                var camLookAt = getLookAt();
                // create unique id for position tween
                var posTweenId_1 = Math.random().toString(36).substring(2, 15);
                tween[posTweenId_1] = new TWEEN.Tween(camPos)
                    .to(finalPos, transitionDuration)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .onUpdate(setCameraPos)
                    .onComplete(function () {
                    tween[posTweenId_1] = undefined;
                })
                    .start();
                // create unique id for lookAt tween
                var lookAtTweenId_1 = Math.random().toString(36).substring(2, 15);
                // Face direction in 1/3rd of time
                tween[lookAtTweenId_1] = new TWEEN.Tween(camLookAt)
                    .to(finalLookAt, transitionDuration / 3)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .onUpdate(setLookAt)
                    .onComplete(function () {
                    tween[lookAtTweenId_1] = undefined;
                })
                    .start();
            }
            // eslint-disable-next-line no-inner-declarations
            function setCameraPos(pos) {
                var x = pos.x, y = pos.y, z = pos.z;
                if (x !== undefined)
                    camera.position.x = x;
                if (y !== undefined)
                    camera.position.y = y;
                if (z !== undefined)
                    camera.position.z = z;
            }
            // eslint-disable-next-line no-inner-declarations
            function setLookAt(lookAt) {
                var lookAtVect = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
                if (controls.target) {
                    controls.target = lookAtVect;
                }
                else {
                    // Fly controls doesn't have target attribute
                    camera.lookAt(lookAtVect); // note: lookAt may be overridden by other controls in some cases
                }
            }
            // eslint-disable-next-line no-inner-declarations
            function getLookAt() {
                return Object.assign(new THREE.Vector3(0, 0, -1000).applyQuaternion(camera.quaternion).add(camera.position));
            }
        }
    };
    /**
     * this will force the camera to look at a specific position
     * @param lookAt
     * @param transitionDuration
     */
    ForceGraphEngine.prototype.cameraLookAt = function (lookAt, transitionDuration) {
        this.cameraPosition(undefined, lookAt, transitionDuration);
    };
    ForceGraphEngine.prototype.removeSelection = function () {
        this.selectedNodes.clear();
        this.updateColor();
    };
    ForceGraphEngine.prototype.searchNode = function (path) {
        var targetNode = this.forceGraph.instance.graphData().getNodeByPath(path);
        if (targetNode)
            this.focusOnCoords(targetNode);
        else
            createNotice_1.createNotice("The node doesn't exist in the graph");
    };
    return ForceGraphEngine;
}());
exports.ForceGraphEngine = ForceGraphEngine;
