"use strict";
exports.__esModule = true;
exports.Graph = void 0;
var Link_1 = require("@/graph/Link");
var Node_1 = require("@/graph/Node");
var copy_anything_1 = require("copy-anything");
var Graph = /** @class */ (function () {
    function Graph(nodes, links, nodeIndex, linkIndex) {
        var _this = this;
        this.getNodeByPath = function (path) {
            var _a;
            return (_a = _this.nodes.find(function (n) { return n.path === path; })) !== null && _a !== void 0 ? _a : null;
        };
        // Clones the graph
        this.clone = function () {
            return new Graph(copy_anything_1.copy(_this.nodes), copy_anything_1.copy(_this.links), copy_anything_1.copy(_this.nodeIndex), copy_anything_1.copy(_this.linkIndex));
        };
        /**
         * filter the nodes of the graph, the links will be filtered automatically.
         * @param predicate what nodes to keep
         * @param graph the graph to filter
         * @returns a new graph
         */
        this.filter = function (predicate, linksPredicate) {
            var filteredNodes = _this.nodes.filter(predicate);
            var filteredLinks = _this.links
                .filter(function (link) {
                // the source and target nodes of a link must be in the filtered nodes
                return (filteredNodes.some(function (node) { return link.source.id === node.id; }) &&
                    filteredNodes.some(function (node) { return link.target.id === node.id; }));
            })
                .filter(linksPredicate !== null && linksPredicate !== void 0 ? linksPredicate : Boolean);
            // transform the link to linkmap
            var linkMap = Link_1.Link.createLinkMap(filteredLinks);
            return Graph.createFromLinkMap(linkMap, filteredNodes);
        };
        this.nodes = nodes;
        this.links = links;
        this.nodeIndex = nodeIndex || new Map();
        this.linkIndex = linkIndex || new Map();
    }
    // Returns a node by its id
    Graph.prototype.getNodeById = function (id) {
        var _a;
        return (_a = this.nodes.find(function (n) { return n.id === id; })) !== null && _a !== void 0 ? _a : null;
    };
    // Returns a link by its source and target node ids
    Graph.prototype.getLinkByIds = function (sourceNodeId, targetNodeId) {
        var sourceLinkMap = this.linkIndex.get(sourceNodeId);
        if (sourceLinkMap) {
            var index = sourceLinkMap.get(targetNodeId);
            if (index !== undefined) {
                // @ts-ignore
                return this.links[index];
            }
        }
        return null;
    };
    // Returns the outgoing links of a node
    Graph.prototype.getLinksFromNode = function (sourceNodeId) {
        var _this = this;
        var sourceLinkMap = this.linkIndex.get(sourceNodeId);
        if (sourceLinkMap) {
            // @ts-ignore
            return Array.from(sourceLinkMap.values()).map(function (index) { return _this.links[index]; });
        }
        return [];
    };
    // Returns the outgoing and incoming links of a node
    Graph.prototype.getLinksWithNode = function (nodeId) {
        var _a, _b;
        // we need to check if the link consists of a Node instance
        // instead of just a string id,
        // because D3 will replace each string id with the real Node instance
        // once the graph is rendered
        // @ts-ignore
        if ((_b = (_a = this.links[0]) === null || _a === void 0 ? void 0 : _a.source) === null || _b === void 0 ? void 0 : _b.id) {
            return this.links.filter(
            // @ts-ignore
            function (link) { return link.source.id === nodeId || link.target.id === nodeId; });
        }
        else {
            return this.links.filter(function (link) { return link.source.id === nodeId || link.target.id === nodeId; });
        }
    };
    Graph.createFromLinkMap = function (map, nodes) {
        // create a new nodes
        var newNodes = nodes.map(function (n) { return new Node_1.Node(n.name, n.path, n.val); });
        var links = [];
        Object.entries(map)
            .map(function (_a) {
            var key = _a[0], value = _a[1];
            var node1 = newNodes.find(function (node) { return node.id === key; });
            if (!node1)
                return null;
            return value.map(function (node2Id) {
                var node2 = newNodes.find(function (node) { return node.id === node2Id; });
                if (!node2)
                    return null;
                links.push(new Link_1.Link(node1, node2));
                return node1.addNeighbor(node2);
            });
        })
            .flat()
            .filter(Boolean);
        // add the links back to node
        links.forEach(function (link) {
            link.source.addLink(link);
            link.target.addLink(link);
        });
        return new Graph(newNodes, links, Node_1.Node.createNodeIndex(newNodes), Link_1.Link.createLinkIndex(links));
    };
    /**
     * get the files from the graph
     */
    Graph.getFiles = function (app, graph) {
        return graph.nodes.map(function (node) { return app.vault.getAbstractFileByPath(node.path); }).filter(Boolean);
    };
    Graph.createEmpty = function () {
        return new Graph([], [], new Map(), new Map());
    };
    // Creates a graph using the Obsidian API
    Graph.createFromApp = function (app) {
        var map = getMapFromMetaCache(app.metadataCache.resolvedLinks);
        var nodes = Node_1.Node.createFromFiles(app.vault.getFiles());
        return Graph.createFromLinkMap(map, nodes);
    };
    Graph.compare = function (graph1, graph2) {
        if (graph1.nodes.length !== graph2.nodes.length) {
            return false;
        }
        if (graph1.links.length !== graph2.links.length) {
            return false;
        }
        var graph2NodeIds = new Set(graph2.nodes.map(function (node) { return node.id; }));
        // Check if all nodes in graph1 exist in graph2
        for (var _i = 0, _a = graph1.nodes; _i < _a.length; _i++) {
            var node1 = _a[_i];
            if (!graph2NodeIds.has(node1.id)) {
                return false;
            }
        }
        function getLinkId(link) {
            return link.source.path + "-" + link.target.path;
        }
        var graph2LinkIds = new Set(graph2.links.map(getLinkId));
        // Check if all links in graph1 exist in graph2
        for (var _b = 0, _c = graph1.links; _b < _c.length; _b++) {
            var link1 = _c[_b];
            if (!graph2LinkIds.has(getLinkId(link1))) {
                return false;
            }
        }
        return true;
    };
    return Graph;
}());
exports.Graph = Graph;
var getMapFromMetaCache = function (resolvedLinks) {
    var result = {};
    Object.keys(resolvedLinks).map(function (nodeId) {
        var _a;
        result[nodeId] = (_a = Object.keys(resolvedLinks[nodeId]).map(function (nodePath) {
            return nodePath;
        })) !== null && _a !== void 0 ? _a : [];
    });
    // remove self links
    Object.keys(result).forEach(function (nodeId) {
        var _a, _b;
        result[nodeId] = (_b = (_a = result[nodeId]) === null || _a === void 0 ? void 0 : _a.filter(function (nodePath) { return nodePath !== nodeId; })) !== null && _b !== void 0 ? _b : [];
    });
    return result;
};
