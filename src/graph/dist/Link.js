"use strict";
exports.__esModule = true;
exports.Link = void 0;
var Link = /** @class */ (function () {
    function Link(source, target) {
        this.source = source;
        this.target = target;
    }
    /**
     * Creates a link index for an array of links
     * @param links
     * @returns
     */
    Link.createLinkIndex = function (links) {
        var linkIndex = new Map();
        links.forEach(function (link, index) {
            var _a;
            if (!linkIndex.has(link.source.id)) {
                linkIndex.set(link.source.id, new Map());
            }
            (_a = linkIndex.get(link.source.id)) === null || _a === void 0 ? void 0 : _a.set(link.target.id, index);
        });
        return linkIndex;
    };
    Link.checkLinksValid = function (links) {
        // if there are duplicate links, then throw an error
        links.forEach(function (link, index) {
            links.forEach(function (link2, index2) {
                if (index !== index2 && Link.compare(link, link2)) {
                    throw new Error("graph duplicate links");
                }
            });
        });
    };
    Link.createLinkMap = function (links) {
        var linkMap = {};
        links.forEach(function (link) {
            var _a;
            if (!linkMap[link.source.id])
                linkMap[link.source.id] = [];
            (_a = linkMap[link.source.id]) === null || _a === void 0 ? void 0 : _a.push(link.target.id);
        });
        return linkMap;
    };
    Link.compare = function (a, b) {
        return a.source.id === b.source.id && a.target.id === b.target.id;
    };
    return Link;
}());
exports.Link = Link;
