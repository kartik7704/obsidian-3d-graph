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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.EmbeddedView = exports.spawnLeafView = exports.isEmebeddedLeaf = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// Original code from https://github.com/nothingislost/obsidian-hover-editor/blob/9ec3449be9ab3433dc46c4c3acfde1da72ff0261/src/popover.ts
// You can use this file as a basic leaf view create method in anywhere
// Please rememeber if you want to use this file, you should patch the types-obsidian.d.ts file
// And also monkey around the Obsidian original method.
var obsidian_1 = require("obsidian");
var PREFIX = "graph-3d";
var popovers = new WeakMap();
function isEmebeddedLeaf(leaf) {
    // Work around missing enhance.js API by checking match condition instead of looking up parent
    return leaf.containerEl.matches("." + PREFIX + "-block." + PREFIX + "-leaf-view .workspace-leaf");
}
exports.isEmebeddedLeaf = isEmebeddedLeaf;
function genId(size) {
    var chars = [];
    for (var n = 0; n < size; n++)
        chars.push(((16 * Math.random()) | 0).toString(16));
    return chars.join("");
}
function nosuper(base) {
    var derived = function derived() {
        var _newTarget = this && this instanceof derived ? this.constructor : void 0;
        return Object.setPrototypeOf(new obsidian_1.Component(), _newTarget.prototype);
    };
    derived.prototype = base.prototype;
    return Object.setPrototypeOf(derived, base);
}
exports.spawnLeafView = function (plugin, initiatingEl, leaf, onShowCallback, props) {
    // When Obsidian doesn't set any leaf active, use leaf instead.
    var parent = app.workspace.activeLeaf;
    if (!parent)
        parent = leaf;
    if (!initiatingEl)
        initiatingEl = parent === null || parent === void 0 ? void 0 : parent.containerEl;
    var hoverPopover = new EmbeddedView(parent, initiatingEl, plugin, undefined, onShowCallback, props);
    return [hoverPopover.attachLeaf(), hoverPopover];
};
var EmbeddedView = /** @class */ (function (_super) {
    __extends(EmbeddedView, _super);
    function EmbeddedView(parent, targetEl, plugin, waitTime, onShowCallback, props) {
        var _a;
        var _b, _c, _d, _e;
        var _this = 
        //
        _super.call(this) || this;
        _this.targetEl = targetEl;
        _this.plugin = plugin;
        _this.onShowCallback = onShowCallback;
        _this.abortController = _this.addChild(new obsidian_1.Component());
        _this.detaching = false;
        _this.opening = false;
        _this.rootSplit = new obsidian_1.WorkspaceSplit(window.app.workspace, "vertical");
        _this.isPinned = true;
        // It is currently not useful.
        // leafInHoverEl: WorkspaceLeaf;
        _this.oldPopover = (_b = _this.parent) === null || _b === void 0 ? void 0 : _b.hoverPopover;
        _this.document = (_e = (_d = (_c = _this.targetEl) === null || _c === void 0 ? void 0 : _c.ownerDocument) !== null && _d !== void 0 ? _d : window.activeDocument) !== null && _e !== void 0 ? _e : window.document;
        _this.id = genId(8);
        _this.hoverEl = _this.document.defaultView.createDiv({
            cls: PREFIX + "-block " + PREFIX + "-leaf-view",
            attr: { id: PREFIX + "-" + _this.id }
        });
        if (waitTime === undefined) {
            waitTime = 300;
        }
        _this.onTarget = true;
        _this.parent = parent;
        _this.waitTime = waitTime;
        _this.state = obsidian_1.PopoverState.Showing;
        _this.abortController.load();
        _this.show();
        _this.onShow();
        _this.setActive = _this._setActive.bind(_this);
        // if (hoverEl) {
        //     hoverEl.addEventListener("mousedown", this.setActive);
        // }
        // custom logic begin
        popovers.set(_this.hoverEl, _this);
        if (props === null || props === void 0 ? void 0 : props.hoverElClasses) {
            (_a = _this.hoverEl).addClass.apply(_a, props.hoverElClasses);
        }
        _this.containerEl = _this.hoverEl.createDiv({ cls: props === null || props === void 0 ? void 0 : props.containerElClasses });
        _this.buildWindowControls();
        _this.setInitialDimensions();
        return _this;
    }
    EmbeddedView.activeWindows = function () {
        var windows = [window];
        var floatingSplit = app.workspace.floatingSplit;
        if (floatingSplit) {
            for (var _i = 0, _a = floatingSplit.children; _i < _a.length; _i++) {
                var split = _a[_i];
                if (split.win)
                    windows.push(split.win);
            }
        }
        return windows;
    };
    EmbeddedView.containerForDocument = function (doc) {
        if (doc !== document && app.workspace.floatingSplit)
            for (var _i = 0, _a = app.workspace.floatingSplit.children; _i < _a.length; _i++) {
                var container = _a[_i];
                if (container.doc === doc)
                    return container;
            }
        return app.workspace.rootSplit;
    };
    EmbeddedView.activePopovers = function () {
        return this.activeWindows().flatMap(this.popoversForWindow);
    };
    EmbeddedView.popoversForWindow = function (win) {
        var _a, _b;
        return Array.prototype.slice.call((_b = (_a = win === null || win === void 0 ? void 0 : win.document) === null || _a === void 0 ? void 0 : _a.body.querySelectorAll("." + PREFIX + "-leaf-view")) !== null && _b !== void 0 ? _b : [])
            .map(function (el) { return popovers.get(el); })
            .filter(function (he) { return he; });
    };
    EmbeddedView.forLeaf = function (leaf) {
        // leaf can be null such as when right clicking on an internal link
        var el = leaf && document.body.matchParent.call(leaf.containerEl, "." + PREFIX + "-leaf-view"); // work around matchParent race condition
        return el ? popovers.get(el) : undefined;
    };
    EmbeddedView.iteratePopoverLeaves = function (ws, cb) {
        for (var _i = 0, _a = this.activePopovers(); _i < _a.length; _i++) {
            var popover = _a[_i];
            if (popover.rootSplit && ws.iterateLeaves(cb, popover.rootSplit))
                return true;
        }
        return false;
    };
    EmbeddedView.prototype._setActive = function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        // @ts-ignore
        this.plugin.app.workspace.setActiveLeaf(this.leaves()[0], {
            focus: true
        });
    };
    EmbeddedView.prototype.getDefaultMode = function () {
        // return this.parent?.view?.getMode ? this.parent.view.getMode() : "source";
        return "source";
    };
    EmbeddedView.prototype.updateLeaves = function () {
        if (this.onTarget && this.targetEl && !this.document.contains(this.targetEl)) {
            this.onTarget = false;
            this.transition();
        }
        var leafCount = 0;
        this.plugin.app.workspace.iterateLeaves(function (leaf) {
            leafCount++;
        }, this.rootSplit);
        if (leafCount === 0) {
            this.hide(); // close if we have no leaves
        }
        this.hoverEl.setAttribute("data-leaf-count", leafCount.toString());
    };
    EmbeddedView.prototype.leaves = function () {
        var leaves = [];
        this.plugin.app.workspace.iterateLeaves(function (leaf) {
            leaves.push(leaf);
        }, this.rootSplit);
        return leaves;
    };
    EmbeddedView.prototype.setInitialDimensions = function () {
        this.hoverEl.style.height = "auto";
        this.hoverEl.style.width = "100%";
    };
    EmbeddedView.prototype.transition = function () {
        var _this = this;
        if (this.shouldShow()) {
            if (this.state === obsidian_1.PopoverState.Hiding) {
                this.state = obsidian_1.PopoverState.Shown;
                clearTimeout(this.timer);
            }
        }
        else {
            if (this.state === obsidian_1.PopoverState.Showing) {
                this.hide();
            }
            else {
                if (this.state === obsidian_1.PopoverState.Shown) {
                    this.state = obsidian_1.PopoverState.Hiding;
                    this.timer = window.setTimeout(function () {
                        if (_this.shouldShow()) {
                            _this.transition();
                        }
                        else {
                            _this.hide();
                        }
                    }, this.waitTime);
                }
            }
        }
    };
    EmbeddedView.prototype.buildWindowControls = function () {
        this.titleEl = this.document.defaultView.createDiv("popover-titlebar");
        this.titleEl.createDiv("popover-title");
        this.containerEl.prepend(this.titleEl);
    };
    EmbeddedView.prototype.attachLeaf = function () {
        var _this = this;
        this.rootSplit.getRoot = function () {
            return _this.plugin.app.workspace[_this.document === document ? "rootSplit" : "floatingSplit"];
        };
        this.rootSplit.getContainer = function () { return EmbeddedView.containerForDocument(_this.document); };
        this.titleEl.insertAdjacentElement("afterend", this.rootSplit.containerEl);
        var leaf = this.plugin.app.workspace.createLeafInParent(this.rootSplit, 0);
        this.updateLeaves();
        return leaf;
    };
    EmbeddedView.prototype.onload = function () {
        var _this = this;
        _super.prototype.onload.call(this);
        this.registerEvent(this.plugin.app.workspace.on("layout-change", this.updateLeaves, this));
        this.registerEvent(app.workspace.on("layout-change", function () {
            // Ensure that top-level items in a popover are not tabbed
            // @ts-ignore
            _this.rootSplit.children.forEach(function (item, index) {
                if (item instanceof obsidian_1.WorkspaceTabs) {
                    _this.rootSplit.replaceChild(index, item.children[0]);
                }
            });
        }));
    };
    EmbeddedView.prototype.onShow = function () {
        var _this = this;
        var _a, _b;
        // Once we've been open for closeDelay, use the closeDelay as a hiding timeout
        var closeDelay = 600;
        setTimeout(function () { return (_this.waitTime = closeDelay); }, closeDelay);
        (_a = this.oldPopover) === null || _a === void 0 ? void 0 : _a.hide();
        this.oldPopover = null;
        this.hoverEl.toggleClass("is-new", true);
        this.document.body.addEventListener("click", function () {
            _this.hoverEl.toggleClass("is-new", false);
        }, { once: true, capture: true });
        if (this.parent) {
            this.parent.hoverPopover = this;
        }
        // Remove original view header;
        var viewHeaderEl = this.hoverEl.querySelector(".view-header");
        viewHeaderEl === null || viewHeaderEl === void 0 ? void 0 : viewHeaderEl.remove();
        var sizer = this.hoverEl.querySelector(".workspace-leaf");
        if (sizer)
            this.hoverEl.appendChild(sizer);
        // Remove original inline tilte;
        var inlineTitle = this.hoverEl.querySelector(".inline-title");
        if (inlineTitle)
            inlineTitle.remove();
        (_b = this.onShowCallback) === null || _b === void 0 ? void 0 : _b.call(this);
        this.onShowCallback = undefined; // only call it once
    };
    EmbeddedView.prototype.detect = function (el) {
        // TODO: may not be needed? the mouseover/out handers handle most detection use cases
        var targetEl = this.targetEl;
        if (targetEl) {
            this.onTarget = el === targetEl || targetEl.contains(el);
        }
    };
    EmbeddedView.prototype.shouldShow = function () {
        return this.shouldShowSelf() || this.shouldShowChild();
    };
    EmbeddedView.prototype.shouldShowChild = function () {
        var _this = this;
        return EmbeddedView.activePopovers().some(function (popover) {
            if (popover !== _this && popover.targetEl && _this.hoverEl.contains(popover.targetEl)) {
                return popover.shouldShow();
            }
            return false;
        });
    };
    EmbeddedView.prototype.shouldShowSelf = function () {
        // Don't let obsidian show() us if we've already started closing
        // return !this.detaching && (this.onTarget || this.onHover);
        return (!this.detaching &&
            !!(this.onTarget ||
                this.state == obsidian_1.PopoverState.Shown ||
                this.document.querySelector("body>.modal-container, body > #he" + this.id + " ~ .menu, body > #he" + this.id + " ~ .suggestion-container")));
    };
    EmbeddedView.prototype.show = function () {
        // native obsidian logic start
        // if (!this.targetEl || this.document.body.contains(this.targetEl)) {
        this.state = obsidian_1.PopoverState.Shown;
        this.timer = 0;
        this.targetEl.appendChild(this.hoverEl);
        this.onShow();
        app.workspace.onLayoutChange();
        // initializingHoverPopovers.remove(this);
        // activeHoverPopovers.push(this);
        // initializePopoverChecker();
        this.load();
        // }
        // native obsidian logic end
        // if this is an image view, set the dimensions to the natural dimensions of the image
        // an interactjs reflow will be triggered to constrain the image to the viewport if it's
        // too large
        if (this.hoverEl.dataset.imgHeight && this.hoverEl.dataset.imgWidth) {
            this.hoverEl.style.height =
                parseFloat(this.hoverEl.dataset.imgHeight) + this.titleEl.offsetHeight + "px";
            this.hoverEl.style.width = parseFloat(this.hoverEl.dataset.imgWidth) + "px";
        }
    };
    EmbeddedView.prototype.onHide = function () {
        var _a;
        this.oldPopover = null;
        if (((_a = this.parent) === null || _a === void 0 ? void 0 : _a.hoverPopover) === this) {
            this.parent.hoverPopover = null;
        }
    };
    EmbeddedView.prototype.hide = function () {
        var _a;
        this.onTarget = false;
        this.detaching = true;
        // Once we reach this point, we're committed to closing
        // in case we didn't ever call show()
        // A timer might be pending to call show() for the first time, make sure
        // it doesn't bring us back up after we close
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = 0;
        }
        // Hide our HTML element immediately, even if our leaves might not be
        // detachable yet.  This makes things more responsive and improves the
        // odds of not showing an empty popup that's just going to disappear
        // momentarily.
        this.hoverEl.hide();
        // If a file load is in progress, we need to wait until it's finished before
        // detaching leaves.  Because we set .detaching, The in-progress openFile()
        // will call us again when it finishes.
        if (this.opening)
            return;
        // Leave this code here to observe the state of the leaves
        var leaves = this.leaves();
        if (leaves.length) {
            // Detach all leaves before we unload the popover and remove it from the DOM.
            // Each leaf.detach() will trigger layout-changed and the updateLeaves()
            // method will then call hide() again when the last one is gone.
            // leaves[0].detach();
            // leaves[0].detach();
            this.targetEl.empty();
        }
        else {
            this.parent = null;
            (_a = this.abortController) === null || _a === void 0 ? void 0 : _a.unload();
            this.abortController = undefined;
            return this.nativeHide();
        }
    };
    EmbeddedView.prototype.nativeHide = function () {
        var _a;
        var _b = this, hoverEl = _b.hoverEl, targetEl = _b.targetEl;
        this.state = obsidian_1.PopoverState.Hidden;
        hoverEl.detach();
        if (targetEl) {
            var parent = targetEl.matchParent("." + PREFIX + "-leaf-view");
            if (parent)
                (_a = popovers.get(parent)) === null || _a === void 0 ? void 0 : _a.transition();
        }
        this.onHide();
        this.unload();
    };
    EmbeddedView.prototype.resolveLink = function (linkText, sourcePath) {
        var link = obsidian_1.parseLinktext(linkText);
        var tFile = link
            ? this.plugin.app.metadataCache.getFirstLinkpathDest(link.path, sourcePath)
            : null;
        return tFile;
    };
    EmbeddedView.prototype.openLink = function (linkText, sourcePath, eState, createInLeaf) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var file, link, folder, viewRegistry, viewType, parentMode, state, leaf, leafViewType, img;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        file = this.resolveLink(linkText, sourcePath);
                        link = obsidian_1.parseLinktext(linkText);
                        if (!(!file && createInLeaf)) return [3 /*break*/, 2];
                        folder = this.plugin.app.fileManager.getNewFileParent(sourcePath);
                        return [4 /*yield*/, this.plugin.app.fileManager.createNewMarkdownFile(folder, link.path)];
                    case 1:
                        file = _d.sent();
                        _d.label = 2;
                    case 2:
                        if (!file) {
                            // this.displayCreateFileAction(linkText, sourcePath, eState);
                            return [2 /*return*/];
                        }
                        viewRegistry = this.plugin.app.viewRegistry;
                        viewType = viewRegistry.typeByExtension[file.extension];
                        if (!viewType || !viewRegistry.viewByType[viewType]) {
                            // this.displayOpenFileAction(file);
                            return [2 /*return*/];
                        }
                        eState = Object.assign(this.buildEphemeralState(file, link), eState);
                        parentMode = this.getDefaultMode();
                        state = this.buildState(parentMode, eState);
                        return [4 /*yield*/, this.openFile(file, state, createInLeaf)];
                    case 3:
                        leaf = _d.sent();
                        leafViewType = (_a = leaf === null || leaf === void 0 ? void 0 : leaf.view) === null || _a === void 0 ? void 0 : _a.getViewType();
                        if (leafViewType === "image") {
                            // TODO: temporary workaround to prevent image popover from disappearing immediately when using live preview
                            if (((_b = this.parent) === null || _b === void 0 ? void 0 : _b.hasOwnProperty("editorEl")) &&
                                this.parent.editorEl.hasClass("is-live-preview")) {
                                this.waitTime = 3000;
                            }
                            img = leaf.view.contentEl.querySelector("img");
                            this.hoverEl.dataset.imgHeight = String(img.naturalHeight);
                            this.hoverEl.dataset.imgWidth = String(img.naturalWidth);
                            this.hoverEl.dataset.imgRatio = String(img.naturalWidth / img.naturalHeight);
                        }
                        else if (leafViewType === "pdf") {
                            this.hoverEl.style.height = "800px";
                            this.hoverEl.style.width = "600px";
                        }
                        if (((_c = state.state) === null || _c === void 0 ? void 0 : _c.mode) === "source") {
                            this.whenShown(function () {
                                var _a, _b, _c, _d;
                                // Not sure why this is needed, but without it we get issue #186
                                if (obsidian_1.requireApiVersion("1.0"))
                                    (_c = (_b = (_a = leaf === null || leaf === void 0 ? void 0 : leaf.view) === null || _a === void 0 ? void 0 : _a.editMode) === null || _b === void 0 ? void 0 : _b.reinit) === null || _c === void 0 ? void 0 : _c.call(_b);
                                (_d = leaf === null || leaf === void 0 ? void 0 : leaf.view) === null || _d === void 0 ? void 0 : _d.setEphemeralState(state.eState);
                            });
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    EmbeddedView.prototype.whenShown = function (callback) {
        var _this = this;
        // invoke callback once the popover is visible
        if (this.detaching)
            return;
        var existingCallback = this.onShowCallback;
        this.onShowCallback = function () {
            if (_this.detaching)
                return;
            callback();
            if (typeof existingCallback === "function")
                existingCallback();
        };
        if (this.state === obsidian_1.PopoverState.Shown) {
            this.onShowCallback();
            this.onShowCallback = undefined;
        }
    };
    EmbeddedView.prototype.openFile = function (file, openState, useLeaf) {
        return __awaiter(this, void 0, void 0, function () {
            var leaf, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.detaching)
                            return [2 /*return*/];
                        leaf = useLeaf !== null && useLeaf !== void 0 ? useLeaf : this.attachLeaf();
                        this.opening = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, leaf.openFile(file, openState)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 5];
                    case 3:
                        e_1 = _a.sent();
                        console.error(e_1);
                        return [3 /*break*/, 5];
                    case 4:
                        this.opening = false;
                        if (this.detaching)
                            this.hide();
                        return [7 /*endfinally*/];
                    case 5:
                        this.plugin.app.workspace.setActiveLeaf(leaf);
                        return [2 /*return*/, leaf];
                }
            });
        });
    };
    EmbeddedView.prototype.buildState = function (parentMode, eState) {
        return {
            active: false,
            state: { mode: "source" },
            eState: eState
        };
    };
    EmbeddedView.prototype.buildEphemeralState = function (file, link) {
        var cache = this.plugin.app.metadataCache.getFileCache(file);
        var subpath = cache ? obsidian_1.resolveSubpath(cache, (link === null || link === void 0 ? void 0 : link.subpath) || "") : undefined;
        var eState = { subpath: link === null || link === void 0 ? void 0 : link.subpath };
        if (subpath) {
            eState.line = subpath.start.line;
            eState.startLoc = subpath.start;
            eState.endLoc = subpath.end || undefined;
        }
        return eState;
    };
    return EmbeddedView;
}(nosuper(obsidian_1.HoverPopover)));
exports.EmbeddedView = EmbeddedView;
