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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.LocalGraph3dView = void 0;
var SettingsSchemas_1 = require("@/SettingsSchemas");
var Graph_1 = require("@/graph/Graph");
var Graph3dView_1 = require("@/views/graph/Graph3dView");
/**
 *
 * @param graph
 * @param id
 * @param depth
 * @param linkType
 * @returns nodes and link of a local graph. If link type is inlinks and outlinks, then it will be acyclic
 */
var traverseNode = function (graph, id, depth, linkType) {
    var visitedNodes = new Set();
    var visitedLinks = new Set();
    var queue = [];
    var startNode = graph.getNodeById(id);
    if (startNode) {
        queue.push({ node: startNode, depth: 0, path: new Set([startNode.path]) });
    }
    var _loop_1 = function () {
        var _a = queue.shift(), node = _a.node, currentDepth = _a.depth, path = _a.path;
        if (!node)
            return "continue";
        if (currentDepth <= depth) {
            visitedNodes.add(node.path);
            node.links.forEach(function (link) {
                if (visitedLinks.has(link)) {
                    return; // Skip already visited links
                }
                var neighbor = link.source === node ? link.target : link.source;
                var isOutlink = link.source === node;
                var isInlink = link.target === node;
                if (linkType === "both" ||
                    (linkType === "outlinks" && isOutlink) ||
                    (linkType === "inlinks" && isInlink)) {
                    // Check for cycles when linkType is not "both"
                    if (linkType !== "both" && path.has(neighbor.path)) {
                        return; // Skip to avoid cycles
                    }
                    visitedLinks.add(link);
                    if (!visitedNodes.has(neighbor.path)) {
                        var newPath = new Set(path);
                        newPath.add(neighbor.path);
                        queue.push({ node: neighbor, depth: currentDepth + 1, path: newPath });
                    }
                }
            });
        }
    };
    while (queue.length > 0) {
        _loop_1();
    }
    // Convert node paths back to node objects and return
    return {
        nodes: __spreadArrays(visitedNodes).map(function (path) { return graph.getNodeById(path); }).filter(Boolean),
        links: __spreadArrays(visitedLinks)
    };
};
/**
 * this is called by the plugin to create a new local graph.
 * It will not have any setting. The files is also
 */
var getNewLocalGraph = function (plugin, config) {
    // get a new local graph (updated with cache) to make sure that the graph is updated with the latest cache
    var _a;
    // get the current search result
    // get the current show attachments and show orphans from graph setting
    // compose a new graph
    var centerFile = (_a = config === null || config === void 0 ? void 0 : config.centerFile) !== null && _a !== void 0 ? _a : plugin.app.workspace.getActiveFile();
    if (!centerFile || !config)
        return Graph_1.Graph.createEmpty();
    var _b = traverseNode(plugin.globalGraph, centerFile.path, config.filterSetting.depth, config.filterSetting.linkType), nodes = _b.nodes, links = _b.links;
    // active file must exist in local graph
    var graph = plugin.globalGraph
        // filter the nodes and links
        .filter(function (node) {
        // the center file, which must be shown
        if (node.path === centerFile.path)
            return true;
        return nodes.some(function (n) { return n.path === node.path; });
    }, function (link) {
        return links.some(function (l) { return l.source.path === link.source.path && l.target.path === link.target.path; });
    })
        .filter(function (node) {
        // the center file, which must be shown
        if (node.path === centerFile.path)
            return true;
        // if node is not a markdown  and show attachment is false, then we will not show it
        if (!node.path.endsWith(".md") && !config.filterSetting.showAttachments)
            return false;
        //  if the search query is not empty and the search result is empty, then we don't need to filter the search result
        if (config.searchResults.length === 0 && config.filterSetting.searchQuery === "")
            return true;
        // if the node is not in the files, then we will not show it, except
        return config.searchResults.some(function (file) { return file.path === node.path; });
    })
        .filter(function (node) {
        // the center file, which must be shown
        if (node.path === centerFile.path)
            return true;
        // if node is an orphan and show orphan is false, then we will not show it
        if (node.links.length === 0 && !config.filterSetting.showOrphans)
            return false;
        return true;
    });
    return graph;
};
var LocalGraph3dView = /** @class */ (function (_super) {
    __extends(LocalGraph3dView, _super);
    function LocalGraph3dView(plugin, leaf) {
        var _this = _super.call(this, leaf, plugin, SettingsSchemas_1.GraphType.local, getNewLocalGraph(plugin)) || this;
        _this.handleFileChange = function (file) {
            if (!file)
                return;
            _this.currentFile = file;
            _this.updateGraphData();
        };
        _this.currentFile = _this.app.workspace.getActiveFile();
        // if this is a local graph, then we need to listen to change of active file
        _this.registerEvent(_this.app.workspace.on("file-open", _this.handleFileChange.bind(_this)));
        return _this;
    }
    LocalGraph3dView.prototype.handleSearchResultChange = function () {
        this.updateGraphData();
    };
    LocalGraph3dView.prototype.handleMetadataCacheChange = function () {
        this.updateGraphData();
    };
    LocalGraph3dView.prototype.getNewGraphData = function () {
        var graph = getNewLocalGraph(this.plugin, {
            centerFile: this.currentFile,
            searchResults: this.settingManager.searchResult.value.filter.files,
            filterSetting: this.settingManager.getCurrentSetting().filter
        });
        return graph;
    };
    LocalGraph3dView.prototype.updateGraphData = function () {
        _super.prototype.updateGraphData.call(this, this.getNewGraphData());
    };
    LocalGraph3dView.prototype.handleGroupColorSearchResultChange = function () {
        var _a;
        (_a = this.forceGraph) === null || _a === void 0 ? void 0 : _a.interactionManager.updateColor();
    };
    LocalGraph3dView.prototype.handleSettingUpdate = function (newSetting) {
        var path = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            path[_i - 1] = arguments[_i];
        }
        _super.prototype.handleSettingUpdate.apply(this, __spreadArrays([newSetting], path));
        if (path.some(function (p) { return p === "filter.depth" || p === "filter.linkType"; })) {
            this.updateGraphData();
        }
        if (path.some(function (p) { return p === "display.dagOrientation"; })) {
            this.forceGraph.updateConfig({
                display: {
                    dagOrientation: newSetting.display.dagOrientation
                }
            });
        }
    };
    return LocalGraph3dView;
}(Graph3dView_1.Graph3dView));
exports.LocalGraph3dView = LocalGraph3dView;
