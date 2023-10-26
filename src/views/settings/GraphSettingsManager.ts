import { TreeItem } from "@/views/atomics/TreeItem";
import { ExtraButtonComponent, TAbstractFile } from "obsidian";
import { UtilitySettingsView } from "@/views/settings/categories/UtilitySettingsView";
import { SavedSettingsView } from "@/views/settings/categories/SavedSettingsView";
import { FilterSettingsView } from "@/views/settings/categories/FilterSettingsView";
import {
  GlobalGraphSettings,
  GraphSetting,
  LocalGraphSettings,
  MySettingManager,
  SavedSetting,
} from "@/SettingManager";
import { State, StateChange } from "@/util/State";
import { GroupSettingsView } from "@/views/settings/categories/GroupSettingsView";
import { DisplaySettingsView } from "@/views/settings/categories/DisplaySettingsView";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { LocalGraph3dView } from "@/views/graph/LocalGraph3dView";
import { AsyncQueue } from "@/util/AsyncQueue";

export type SearchResult = {
  filter: {
    files: Prettify<Omit<TAbstractFile, "vault" | "parent">>[];
  };
  groups: {
    files: Prettify<Omit<TAbstractFile, "vault" | "parent">>[];
  }[];
};

/**
 * this setting manager is responsible for managing the settings of a graph view
 */
export class GraphSettingManager<T extends Graph3dView = Graph3dView> {
  private graphView: T;

  public readonly containerEl: HTMLDivElement;
  private settingsButton: ExtraButtonComponent;
  private graphControlsEl: HTMLDivElement;

  public filterSettingView: ReturnType<typeof FilterSettingsView>;
  public displaySettingView: ReturnType<typeof DisplaySettingsView>;

  protected currentSetting: State<SavedSetting["setting"]>;
  protected settingChanges: StateChange<unknown, GraphSetting>[] = [];

  public searchResult: State<SearchResult> = new State({
    filter: { query: "", files: [] },
    groups: [],
  } as SearchResult);
  protected searchResultChanges: StateChange<unknown, SearchResult>[] = [];
  private asyncQueue = new AsyncQueue();

  constructor(parentView: T) {
    this.graphView = parentView;
    this.containerEl = document.createElement("div");
    this.containerEl.classList.add("graph-settings-view");

    this.currentSetting = new State(MySettingManager.getNewSetting(this.graphView.graphType));

    this.settingsButton = new ExtraButtonComponent(this.containerEl)
      .setIcon("settings")
      .setTooltip("Open graph settings")
      .onClick(this.onSettingsButtonClicked);

    // add this setting view to the parent view
    this.graphView.contentEl.appendChild(this.containerEl);
    this.initNewView(true);

    this.currentSetting.onChange((change: StateChange<unknown, GraphSetting>) =>
      this.settingChanges.push(change)
    );

    // tell the graph view to handle search result change
    this.searchResult.onChange((change: StateChange<unknown, SearchResult>) => {
      // push to search result change first
      this.searchResultChanges.push(change);
      if (change.currentPath === "filter.files") {
        // update the graph data
        this.graphView.handleSearchResultChange();
      } else if (change.currentPath.startsWith("groups")) {
        // update the graph setting
        this.graphView.handleGroupColorSearchResultChange();
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
      (...args) => {
        this.filterSettingView = FilterSettingsView(...args, this);
        return this.filterSettingView;
      }
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
    this.updateCurrentSettings((setting) => {
      setting.value = MySettingManager.getNewSetting(this.graphView.graphType);
    });

    this.initNewView(false);
  }

  public applySettings(newSetting: SavedSetting["setting"]) {
    this.updateCurrentSettings((setting) => {
      setting.value = newSetting;
    });
    this.initNewView(false);
  }

  /**
   * this will update the current setting and return the updated setting
   */
  updateCurrentSettings(
    /**
     * user can directly update the setting
     */
    updateFunc: (setting: typeof this.currentSetting) => void,
    /**
     * you can use this to tell the graph view to update the graph view.
     * Set this to false when there are sequential update
     */
    shouldUpdateGraphView = true
  ) {
    updateFunc(this.currentSetting);

    if (shouldUpdateGraphView)
      // tell the graph to handle setting update
      // if path length is 0, then it means the whole setting is updated
      this.unpackStateChanges();

    return this.currentSetting.value;
  }

  /**
   * this will get all the changes in the state and unpack it to the graph view.
   * Then reset the state changes
   */
  public unpackStateChanges() {
    this.graphView.handleSettingUpdate(
      this.currentSetting.value,
      // remove duplicates
      ...new Set(this.settingChanges.map((c) => c.currentPath as NestedKeyOf<GraphSetting>))
    );

    this.settingChanges = [];
  }

  /**
   * return the current setting. This is useful for saving the setting
   */
  public getCurrentSetting() {
    return this.currentSetting.value as T extends LocalGraph3dView
      ? LocalGraphSettings
      : GlobalGraphSettings;
  }

  public getGraphView() {
    return this.graphView;
  }
}
