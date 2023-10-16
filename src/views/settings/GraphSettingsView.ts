import { TreeItem } from "@/views/atomics/TreeItem";
import { DisplaySettingsView } from "@/views/settings/categories/DisplaySettingsView";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { DisplaySettings } from "@/settings/categories/DisplaySettings";
import { App, ExtraButtonComponent } from "obsidian";
import { State, StateChange } from "@/util/State";
import { GroupSettingsView } from "@/views/settings/categories/GroupSettingsView";
import { FilterSettingsView } from "@/views/settings/categories/FilterSettingsView";
import { GraphSettings } from "@/settings/GraphSettings";
import { ObsidianTheme } from "@/util/ObsidianTheme";
import { eventBus } from "@/util/EventBus";

export class GraphSettingsView extends HTMLDivElement {
  private app: App;
  private settingsButton: ExtraButtonComponent;
  private graphControls: HTMLDivElement;
  private readonly settingsState: State<GraphSettings>;
  private readonly theme: ObsidianTheme;

  constructor(settingsState: State<GraphSettings>, theme: ObsidianTheme, app: App) {
    super();
    this.settingsState = settingsState;
    this.theme = theme;
    this.app = app;
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
    this.appendSetting(
      this.settingsState.createSubState("value.filters", FilterSettings),
      "Filters",
      (...args) => FilterSettingsView(...args, this.app)
    );
    this.appendSetting(
      this.settingsState.createSubState("value.groups", GroupSettings),
      "Groups",
      (...args) => GroupSettingsView(...args, this.theme)
    );
    this.appendSetting(
      this.settingsState.createSubState("value.display", DisplaySettings),
      "Display",
      DisplaySettingsView
    );
    this.initListeners();
    this.toggleCollapsed(this.isCollapsedState.value);
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
  private toggleCollapsed(collapsed: boolean) {
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
    new ExtraButtonComponent(containerEl)
      .setIcon("x")
      .setTooltip("Close")
      .onClick(() => (this.isCollapsedState.value = true));
  }

  // utility function to append a setting
  private appendSetting<S>(
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

if (typeof customElements.get("graph-settings-view") === "undefined") {
  customElements.define("graph-settings-view", GraphSettingsView, {
    extends: "div",
  });
}
