"use strict";
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.GraphSettingManager = void 0;
var TreeItem_1 = require("@/views/atomics/TreeItem");
var obsidian_1 = require("obsidian");
var UtilitySettingsView_1 = require("@/views/settings/categories/UtilitySettingsView");
var SavedSettingsView_1 = require("@/views/settings/categories/SavedSettingsView");
var FilterSettingsView_1 = require("@/views/settings/categories/FilterSettingsView");
var SettingManager_1 = require("@/SettingManager");
var State_1 = require("@/util/State");
var GroupSettingsView_1 = require("@/views/settings/categories/GroupSettingsView");
var DisplaySettingsView_1 = require("@/views/settings/categories/DisplaySettingsView");
var AsyncQueue_1 = require("@/util/AsyncQueue");
var waitFor_1 = require("@/util/waitFor");
/**
 * this setting manager is responsible for managing the settings of a graph view
 */
var GraphSettingManager = /** @class */ (function () {
    function GraphSettingManager(parentView) {
        var _this = this;
        this.settingChanges = [];
        this.searchResult = new State_1.State({
            filter: { files: [] },
            groups: []
        });
        this.searchResultChanges = [];
        this.asyncQueue = new AsyncQueue_1.AsyncQueue();
        this.onSettingsButtonClicked = function () {
            _this.toggleCollapsed(false);
        };
        this.graphView = parentView;
        this.containerEl = document.createElement("div");
        this.containerEl.classList.add("graph-settings-view");
        this.currentSetting = new State_1.State(SettingManager_1.MySettingManager.getNewSetting(this.graphView.graphType));
        this.settingsButton = new obsidian_1.ExtraButtonComponent(this.containerEl)
            .setIcon("settings")
            .setTooltip("Open graph settings")
            .onClick(this.onSettingsButtonClicked);
        // add this setting view to the parent view
        this.graphView.contentEl.appendChild(this.containerEl);
        this.initNewView(true);
        this.currentSetting.onChange(function (change) {
            return _this.settingChanges.push(change);
        });
        // tell the graph view to handle search result change
        this.searchResult.onChange(function (change) {
            // push to search result change first
            _this.searchResultChanges.push(change);
            if (change.currentPath === "filter.files") {
                // update the graph data
                _this.graphView.handleSearchResultChange();
            }
            else if (change.currentPath.startsWith("groups")) {
                // update the graph setting
                _this.graphView.handleGroupColorSearchResultChange();
            }
            // then if async queue is empty, add a task to async queue
            // if (this.asyncQueue.queue.length === 0) {
            //   this.asyncQueue.push(async () => {
            //     await waitForStable(
            //       () => {
            //         return this.searchResultChanges.length;
            //       },
            //       { timeout: 3000, minDelay: 200, interval: 100 }
            //     );
            //     // if search result changes is stable, then we will unpack the changes
            //     this.unpackSearchResultChanges();
            //   });
            // }
        });
    }
    GraphSettingManager.prototype.initNewView = function (collapsed) {
        var _this = this;
        var _a;
        if (collapsed === void 0) { collapsed = false; }
        // this ensure that the graph controls element is empty
        (_a = this.graphControlsEl) === null || _a === void 0 ? void 0 : _a.remove();
        // also remove all the search result container
        this.graphView.containerEl
            .querySelectorAll(".search-result-container")
            .forEach(function (el) { return el.remove(); });
        this.graphControlsEl = document.createElement("div");
        this.graphControlsEl.classList.add("graph-controls");
        this.containerEl.appendChild(this.graphControlsEl);
        // create the control buttons
        this.appendGraphControlsItems(this.graphControlsEl.createDiv({ cls: "control-buttons" }));
        // add the filter settings
        this.appendSettingGroup(this.graphControlsEl, this.currentSetting.value.filter, "Filters", function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this;
                            return [4 /*yield*/, FilterSettingsView_1.FilterSettingsView.apply(void 0, __spreadArrays(args, [this]))];
                        case 1:
                            _a.filterSettingView = _b.sent();
                            return [2 /*return*/, this.filterSettingView];
                    }
                });
            });
        });
        // add the group settings
        this.appendSettingGroup(this.graphControlsEl, this.currentSetting.value.groups, "Groups", function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = this;
                            return [4 /*yield*/, GroupSettingsView_1.GroupSettingsView.apply(void 0, __spreadArrays(args, [this.graphView]))];
                        case 1:
                            _a.groupSettingView = _b.sent();
                            return [2 /*return*/, this.groupSettingView];
                    }
                });
            });
        });
        this.appendSettingGroup(this.graphControlsEl, this.currentSetting.value, "Display", function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            _this.displaySettingView = DisplaySettingsView_1.DisplaySettingsView.apply(void 0, __spreadArrays(args, [_this]));
            return _this.displaySettingView;
        });
        this.appendSettingGroup(this.graphControlsEl, undefined, "Utils", function (_, containerEl) {
            return UtilitySettingsView_1.UtilitySettingsView(containerEl, _this.graphView);
        });
        this.appendSettingGroup(this.graphControlsEl, undefined, "Saved settings", function (_, containerEl) {
            return SavedSettingsView_1.SavedSettingsView(containerEl, _this.graphView);
        });
        this.toggleCollapsed(collapsed);
        // this will keep triggering search until at least it trigger once
        waitFor_1.waitFor(function () {
            return _this.triggerSearch();
        }, {});
    };
    // toggle the view to collapsed or expanded
    GraphSettingManager.prototype.toggleCollapsed = function (collapsed) {
        if (collapsed) {
            this.settingsButton.setDisabled(false);
            this.settingsButton.extraSettingsEl.classList.remove("hidden");
            this.graphControlsEl.classList.add("hidden");
        }
        else {
            this.settingsButton.setDisabled(true);
            this.settingsButton.extraSettingsEl.classList.add("hidden");
            this.graphControlsEl.classList.remove("hidden");
        }
    };
    GraphSettingManager.prototype.appendGraphControlsItems = function (containerEl) {
        var _this = this;
        new obsidian_1.ExtraButtonComponent(containerEl)
            .setIcon("refresh-cw")
            .setTooltip("Refresh")
            .onClick(function () {
            _this.graphView.refreshGraph();
        });
        new obsidian_1.ExtraButtonComponent(containerEl)
            .setIcon("eraser")
            .setTooltip("Clear setting")
            .onClick(function () { return _this.resetSettings(); });
        new obsidian_1.ExtraButtonComponent(containerEl)
            .setIcon("x")
            .setTooltip("Close")
            .onClick(function () {
            _this.toggleCollapsed(true);
        });
    };
    // utility function to append a setting
    GraphSettingManager.prototype.appendSettingGroup = function (containerEl, setting, title, view) {
        var header = document.createElement("header");
        header.classList.add("graph-control-section-header");
        header.innerHTML = title;
        var item = new TreeItem_1.TreeItem(header, [function (containerEl) { return view(setting, containerEl); }]);
        item.render(containerEl);
    };
    /**
     * this will reset the settings to the default settings. This will reset the setting view.
     */
    GraphSettingManager.prototype.resetSettings = function () {
        var _this = this;
        // also clear all the search result
        this.searchResult.value.filter.files = [];
        this.searchResult.value.groups = [];
        // reset the current setting
        this.updateCurrentSettings(function (setting) {
            setting.value = SettingManager_1.MySettingManager.getNewSetting(_this.graphView.graphType);
        });
        this.initNewView(false);
    };
    GraphSettingManager.prototype.applySettings = function (newSetting) {
        // clear an init the search result
        this.searchResult.value.filter.files = [];
        this.searchResult.value.groups = newSetting.groups.map(function (g) { return ({
            files: []
        }); });
        this.updateCurrentSettings(function (setting) {
            setting.value = newSetting;
        });
        this.initNewView(false);
    };
    GraphSettingManager.prototype.triggerSearch = function () {
        var _a, _b;
        // console.log(this.filterSettingView, this.groupSettingView);
        (_a = this.filterSettingView) === null || _a === void 0 ? void 0 : _a.triggerSearch();
        (_b = this.groupSettingView) === null || _b === void 0 ? void 0 : _b.triggerSearch();
        return Boolean(this.filterSettingView && this.groupSettingView);
    };
    /**
     * this will update the current setting and return the updated setting
     */
    GraphSettingManager.prototype.updateCurrentSettings = function (
    /**
     * user can directly update the setting
     */
    updateFunc, 
    /**
     * you can use this to tell the graph view to update the graph view.
     * Set this to false when there are sequential update
     */
    shouldUpdateGraphView) {
        if (shouldUpdateGraphView === void 0) { shouldUpdateGraphView = true; }
        updateFunc(this.currentSetting);
        if (shouldUpdateGraphView)
            // tell the graph to handle setting update
            // if path length is 0, then it means the whole setting is updated
            this.unpackStateChanges();
        return this.currentSetting.value;
    };
    /**
     * this will get all the changes in the state and unpack it to the graph view.
     * Then reset the state changes
     */
    GraphSettingManager.prototype.unpackStateChanges = function () {
        var _a;
        var changes = __spreadArrays(new Set(this.settingChanges.map(function (c) { return c.currentPath; })));
        // if it is replace the whole setting, then we will not unpack the changes
        // if (!changes.includes("") && !changes.includes("filter.searchQuery"))
        (_a = this.graphView).handleSettingUpdate.apply(_a, __spreadArrays([this.currentSetting.value], changes));
        this.settingChanges = [];
    };
    /**
     * return the current setting. This is useful for saving the setting
     */
    GraphSettingManager.prototype.getCurrentSetting = function () {
        return this.currentSetting.value;
    };
    GraphSettingManager.prototype.getGraphView = function () {
        return this.graphView;
    };
    return GraphSettingManager;
}());
exports.GraphSettingManager = GraphSettingManager;
