import { TreeItem } from "@/views/atomics/TreeItem";
import { ExtraButtonComponent } from "obsidian";
import { UtilitySettingsView } from "@/views/settings/categories/UtilitySettingsView";
import { SavedSettingsView } from "@/views/settings/categories/SavedSettingsView";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { FilterSettingsView } from "@/views/settings/categories/FilterSettingsView";
import { SavedSetting } from "@/SettingManager";
import { State } from "@/util/State";
import { copy } from "copy-anything";
import { GroupSettingsView } from "@/views/settings/categories/GroupSettingsView";
import { DisplaySettingsView } from "@/views/settings/categories/DisplaySettingsView";
import { IActiveSearchEngine } from "@/Interfaces";

/**
 * this setting manager is responsible for managing the settings of a graph view
 */
export class GraphSettingManager {
  private graphView: NewGraph3dView;

  public readonly containerEl: HTMLDivElement;
  private settingsButton: ExtraButtonComponent;
  private graphControlsEl: HTMLDivElement;
  public displaySettingView: ReturnType<typeof DisplaySettingsView>;

  private currentSetting: State<SavedSetting["setting"]>;

  constructor(parentView: NewGraph3dView) {
    this.graphView = parentView;
    this.containerEl = document.createElement("div");
    this.containerEl.classList.add("graph-settings-view");

    this.currentSetting = new State(
      this.graphView.plugin.settingManager.getNewSetting(this.graphView.graphType)
    );

    this.settingsButton = new ExtraButtonComponent(this.containerEl)
      .setIcon("settings")
      .setTooltip("Open graph settings")
      .onClick(this.onSettingsButtonClicked);

    // add this setting view to the parent view
    this.graphView.contentEl.appendChild(this.containerEl);
    this.initNewView(true);
  }

  initNewView(collapsed = false) {
    // this ensure that the graph controls element is empty
    this.graphControlsEl?.remove();
    this.graphControlsEl = document.createElement("div");
    this.graphControlsEl.classList.add("graph-controls");

    this.containerEl.appendChild(this.graphControlsEl);

    // create the control buttons
    this.appendGraphControlsItems(this.graphControlsEl.createDiv({ cls: "control-buttons" }));

    // add the filter settings
    this.appendSettingGroup(
      this.graphControlsEl,
      this.currentSetting.value.filter,
      "Filters",
      (...args) => FilterSettingsView(...args, this)
    );

    // add the group settings
    this.appendSettingGroup(
      this.graphControlsEl,
      this.currentSetting.value.groups,
      "Groups",
      (...args) => GroupSettingsView(...args, this.graphView)
    );
    this.appendSettingGroup(
      this.graphControlsEl,
      this.currentSetting.value,
      "Display",
      (...args) => {
        this.displaySettingView = DisplaySettingsView(...args, this);
        return this.displaySettingView;
      }
    );
    this.appendSettingGroup(this.graphControlsEl, undefined, "Utils", (_, containerEl) =>
      UtilitySettingsView(containerEl, this.graphView)
    );

    this.appendSettingGroup(this.graphControlsEl, undefined, "Saved settings", (_, containerEl) =>
      SavedSettingsView(containerEl, this.graphView)
    );

    this.toggleCollapsed(collapsed);
  }

  // toggle the view to collapsed or expanded
  toggleCollapsed(collapsed: boolean) {
    if (collapsed) {
      this.settingsButton.setDisabled(false);
      this.settingsButton.extraSettingsEl.classList.remove("hidden");
      this.graphControlsEl.classList.add("hidden");
    } else {
      this.settingsButton.setDisabled(true);
      this.settingsButton.extraSettingsEl.classList.add("hidden");
      this.graphControlsEl.classList.remove("hidden");
    }
  }

  private onSettingsButtonClicked = () => {
    this.toggleCollapsed(false);
  };

  private appendGraphControlsItems(containerEl: HTMLElement) {
    new ExtraButtonComponent(containerEl)
      .setIcon("refresh-cw")
      .setTooltip("Refresh")
      .onClick(() => {
        this.graphView.refreshGraph();
      });
    new ExtraButtonComponent(containerEl)
      .setIcon("eraser")
      .setTooltip("Clear setting")
      .onClick(() => this.resetSettings());
    new ExtraButtonComponent(containerEl)
      .setIcon("x")
      .setTooltip("Close")
      .onClick(() => {
        this.toggleCollapsed(true);
      });
  }

  // utility function to append a setting
  private appendSettingGroup<S>(
    containerEl: HTMLDivElement,
    setting: S,
    title: string,
    view: (setting: S, containerEl: HTMLElement) => void
  ) {
    const header = document.createElement("header");
    header.classList.add("graph-control-section-header");
    header.innerHTML = title;
    const item = new TreeItem(header, [(containerEl: HTMLElement) => view(setting, containerEl)]);
    item.render(containerEl);
  }

  /**
   * this will reset the settings to the default settings. This will reset the setting view.
   */
  public resetSettings() {
    // reset the current setting
    this.updateCurrentSettings(() => {
      return this.graphView.plugin.settingManager.getNewSetting(this.graphView.graphType);
    });

    this.initNewView(false);
  }

  public applySettings(setting: SavedSetting["setting"]) {
    this.updateCurrentSettings(() => {
      return setting;
    });
    this.initNewView(false);
  }

  /**
   * this will update the current setting and return the updated setting
   */
  updateCurrentSettings(updateFunc: (setting: SavedSetting["setting"]) => SavedSetting["setting"]) {
    // update the setting first
    this.currentSetting.value = updateFunc(copy(this.currentSetting.value));

    // if it is passive search engine, the graph view will subscribe to the change of the search query
    // we don't need to do it here
    if (this.graphView.plugin.fileManager.searchEngine instanceof IActiveSearchEngine) {
      // if any search query is changed, we need to call the file manager to look for the result of the search query
      // store the search result and compose a new graph object
      // pass the updated graph object or any other new config to update the graph
    }

    return this.currentSetting.value;
  }

  /**
   * return the current setting. This is useful for saving the setting
   */
  public getCurrentSetting() {
    return this.currentSetting.value;
  }

  public getGraphView() {
    return this.graphView;
  }
}
