"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
exports.Graph3dView = void 0;
var config_1 = require("@/config");
var Graph_1 = require("@/graph/Graph");
var createNotice_1 = require("@/util/createNotice");
var NewForceGraph_1 = require("@/views/graph/NewForceGraph");
var GraphSettingsManager_1 = require("@/views/settings/GraphSettingsManager");
var obsidian_1 = require("obsidian");
var Graph3dView = /** @class */ (function (_super) {
    __extends(Graph3dView, _super);
    function Graph3dView(leaf, plugin, graphType, graph) {
        var _this = _super.call(this, leaf) || this;
        _this.plugin = plugin;
        _this.graphType = graphType;
        _this.settingManager = new GraphSettingsManager_1.GraphSettingManager(_this);
        _this.forceGraph = new NewForceGraph_1.NewForceGraph(_this, graph);
        // set up some UI stuff
        _this.contentEl.classList.add("graph-3d-view");
        // move the setting to the front of the graph
        _this.contentEl.appendChild(_this.settingManager.containerEl);
        return _this;
    }
    Graph3dView.prototype.onload = function () {
        _super.prototype.onload.call(this);
        this.plugin.activeGraphViews.push(this);
    };
    Graph3dView.prototype.onunload = function () {
        var _this = this;
        var _a;
        _super.prototype.onunload.call(this);
        (_a = this.forceGraph) === null || _a === void 0 ? void 0 : _a.instance._destructor();
        this.plugin.activeGraphViews = this.plugin.activeGraphViews.filter(function (view) { return view !== _this; });
    };
    Graph3dView.prototype.getDisplayText = function () {
        return config_1.config.displayText[this.graphType];
    };
    Graph3dView.prototype.getViewType = function () {
        return config_1.config.viewType[this.graphType];
    };
    Graph3dView.prototype.getIcon = function () {
        return config_1.config.icon;
    };
    Graph3dView.prototype.onResize = function () {
        _super.prototype.onResize.call(this);
        if (this.forceGraph)
            this.forceGraph.updateDimensions();
    };
    /**
     * get the current force graph object
     */
    Graph3dView.prototype.getForceGraph = function () {
        return this.forceGraph;
    };
    /**
     * destroy the old graph, remove the old graph completely from the DOM.
     * reassign a new graph base on setting like the constructor,
     * then render it.
     */
    Graph3dView.prototype.refreshGraph = function () {
        var _a, _b;
        var graph = (_a = this.forceGraph) === null || _a === void 0 ? void 0 : _a.instance.graphData();
        // get the first child of the content element
        var forceGraphEl = this.contentEl.firstChild;
        forceGraphEl === null || forceGraphEl === void 0 ? void 0 : forceGraphEl.remove();
        // destroy the old graph, remove the old graph completely from the DOM
        (_b = this.forceGraph) === null || _b === void 0 ? void 0 : _b.instance._destructor();
        // reassign a new graph base on setting like the constructor
        this.forceGraph = new NewForceGraph_1.NewForceGraph(this, graph);
        // move the setting to the front of the graph
        this.contentEl.appendChild(this.settingManager.containerEl);
        this.onResize();
    };
    /**
     * given some files, update the graph data.
     */
    Graph3dView.prototype.updateGraphData = function (graph) {
        var _a;
        var tooLarge = graph.nodes.length > this.plugin.settingManager.getSettings().pluginSetting.maxNodeNumber;
        if (tooLarge) {
            createNotice_1.createNotice("Graph is too large to be rendered. Have " + graph.nodes.length + " nodes.");
        }
        (_a = this.forceGraph) === null || _a === void 0 ? void 0 : _a.updateGraph(tooLarge ? Graph_1.Graph.createEmpty() : graph);
        // get current focus element
        var focusEl = document.activeElement;
        // move the setting to the front of the graph
        this.contentEl.appendChild(this.settingManager.containerEl);
        // focus on the focus element
        try {
            focusEl === null || focusEl === void 0 ? void 0 : focusEl.focus();
        }
        catch (e) {
            console.error(e.message);
        }
        // make sure the render is at the right place
        this.onResize();
    };
    /**
     * when the setting is updated, the graph view need to know how to response to this.
     */
    Graph3dView.prototype.handleSettingUpdate = function (newSetting) {
        var _a, _b, _c, _d, _e, _f, _g;
        var path = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            path[_i - 1] = arguments[_i];
        }
        if (path.includes("")) {
            (_a = this.forceGraph) === null || _a === void 0 ? void 0 : _a.interactionManager.updateNodeLabelDiv();
        }
        if (path.some(function (p) { return p === "filter.showAttachments" || p === "filter.showOrphans"; })) {
            // we need to update force graph data
            this.updateGraphData(this.getNewGraphData());
        }
        if (path.some(function (p) { return p.startsWith("groups"); })) {
            (_b = this.forceGraph) === null || _b === void 0 ? void 0 : _b.interactionManager.updateColor();
        }
        if (path.includes("display.nodeSize")) {
            (_c = this.forceGraph) === null || _c === void 0 ? void 0 : _c.updateConfig({
                display: {
                    nodeSize: newSetting.display.nodeSize
                }
            });
        }
        if (path.includes("display.linkDistance")) {
            (_d = this.forceGraph) === null || _d === void 0 ? void 0 : _d.updateConfig({
                display: {
                    linkDistance: newSetting.display.linkDistance
                }
            });
        }
        if (path.includes("display.nodeRepulsion")) {
            (_e = this.forceGraph) === null || _e === void 0 ? void 0 : _e.updateConfig({
                display: {
                    nodeRepulsion: newSetting.display.nodeRepulsion
                }
            });
        }
        if (path.includes("display.showCenterCoordinates")) {
            (_f = this.forceGraph) === null || _f === void 0 ? void 0 : _f.updateConfig({
                display: {
                    showCenterCoordinates: newSetting.display.showCenterCoordinates
                }
            });
        }
        if (path.includes("display.showExtension") || path.includes("display.showFullPath")) {
            (_g = this.forceGraph) === null || _g === void 0 ? void 0 : _g.interactionManager.updateNodeLabelDiv();
        }
    };
    return Graph3dView;
}(obsidian_1.ItemView));
exports.Graph3dView = Graph3dView;
