import { TreeItem } from "@/views/atomics/TreeItem";
import { DisplaySettingsView } from "@/views/settings/categories/DisplaySettingsView";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { DisplaySettings } from "@/settings/categories/DisplaySettings";
import { ExtraButtonComponent, WorkspaceLeaf } from "obsidian";
import { State, StateChange } from "@/util/State";
import { GroupSettingsView } from "@/views/settings/categories/GroupSettingsView";
import { FilterSettingsView } from "@/views/settings/categories/FilterSettingsView";
import { GraphSettings } from "@/settings/GraphSettings";
import { eventBus } from "@/util/EventBus";
import { UtilitySettingsView } from "@/views/settings/categories/UtilitySettingsView";
import { Graph3dView } from "@/views/graph/Graph3dView";

export class GraphSettingsView extends HTMLDivElement {
  private settingsButton: ExtraButtonComponent;
  private graphControls: HTMLDivElement;
  private readonly settingsState: State<GraphSettings>;
  searchLeaf: WorkspaceLeaf;
  private parentView: Graph3dView;

  constructor(settingsState: State<GraphSettings>, parentView: Graph3dView) {
    super();
    this.settingsState = settingsState;
    this.parentView = parentView;
  }

  public getParentView() {
    return this.parentView;
  }

  private isCollapsedState = new State(true);

  private callbackUnregisterHandles: (() => void)[] = [];

  async connectedCallback() {
    this.classList.add("graph-settings-view");

    this.settingsButton = new ExtraButtonComponent(this)
      .setIcon("settings")
      .setTooltip("Open graph settings")
      .onClick(this.onSettingsButtonClicked);

    this.graphControls = this.createDiv({ cls: "graph-controls" });

    this.appendGraphControlsItems(this.graphControls.createDiv({ cls: "control-buttons" }));
    this.appendSettingGroup(
      this.settingsState.createSubState("value.filters", FilterSettings),
      "Filters",
      (...args) => FilterSettingsView(...args, this.parentView)
    );
    this.appendSettingGroup(
      this.settingsState.createSubState("value.groups", GroupSettings),
      "Groups",
      (...args) => GroupSettingsView(...args, this.parentView)
    );
    this.appendSettingGroup(
      this.settingsState.createSubState("value.display", DisplaySettings),
      "Display",
      DisplaySettingsView
    );
    this.appendSettingGroup(undefined, "Utils", (_, containerEl) =>
      UtilitySettingsView(containerEl, this.parentView)
    );
    this.initListeners();
    this.toggleCollapsed(this.isCollapsedState.value);

    // init search view
  }

  private initListeners() {
    eventBus.on("did-reset-settings", () => {
      // Re append all settings
      this.disconnectedCallback();
      this.connectedCallback();
    });
    this.callbackUnregisterHandles.push(this.isCollapsedState.onChange(this.onIsCollapsedChanged));
  }

  // clicked to collapse/expand
  private onIsCollapsedChanged = (stateChange: StateChange<boolean>) => {
    const collapsed = stateChange.newValue!; // the new value cannot be deleted, it must be defined
    this.toggleCollapsed(collapsed);
  };

  // toggle the view to collapsed or expanded
  toggleCollapsed(collapsed: boolean) {
    if (collapsed) {
      this.settingsButton.setDisabled(false);
      this.graphControls.classList.add("hidden");
    } else {
      this.settingsButton.setDisabled(true);
      this.graphControls.classList.remove("hidden");
    }
  }

  private onSettingsButtonClicked = () => {
    console.log("settings button clicked");
    this.isCollapsedState.value = !this.isCollapsedState.value;
  };

  private appendGraphControlsItems(containerEl: HTMLElement) {
    this.appendPullButton(containerEl);
    this.appendResetButton(containerEl);
    this.appendMinimizeButton(containerEl);
  }

  private appendPullButton(containerEl: HTMLElement) {
    new ExtraButtonComponent(containerEl)
      .setIcon("refresh-ccw")
      .setTooltip("Pull node together")
      .onClick(() => eventBus.trigger("do-pull"));
  }

  private appendResetButton(containerEl: HTMLElement) {
    new ExtraButtonComponent(containerEl)
      .setIcon("eraser")
      .setTooltip("Reset to default")
      .onClick(() => eventBus.trigger("do-reset-settings"));
  }

  private appendMinimizeButton(containerEl: HTMLElement) {
    // on close
    new ExtraButtonComponent(containerEl)
      .setIcon("x")
      .setTooltip("Close")
      .onClick(() => {
        this.isCollapsedState.value = true;
        console.log("graph setting is closed");
      });
  }

  // utility function to append a setting
  private appendSettingGroup<S>(
    setting: S,
    title: string,
    view: (setting: S, containerEl: HTMLElement) => void
  ) {
    const header = document.createElement("header");
    header.classList.add("graph-control-section-header");
    header.innerHTML = title;
    const item = new TreeItem(header, [(containerEl: HTMLElement) => view(setting, containerEl)]);
    item.classList.add("is-collapsed");
    this.graphControls.append(item);
  }

  async disconnectedCallback() {
    this.empty();
    this.callbackUnregisterHandles.forEach((handle) => handle());
  }
}

// TODO: this has a problem that cause illegal constructor error
if (typeof customElements.get("graph-settings-view") === "undefined") {
  customElements.define("graph-settings-view", GraphSettingsView, {
    extends: "div",
  });
}
