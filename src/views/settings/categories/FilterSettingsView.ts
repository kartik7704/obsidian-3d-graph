import { Setting } from "obsidian";

import { addSearchInput } from "@/views/atomics/addSearchInput";
import { BaseFilterSettings, LocalFilterSetting, LocalGraphSettings } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import { GraphSettingManager } from "@/views/settings/GraphSettingsManager";
import { State } from "@/util/State";
import { PassiveSearchEngine } from "@/PassiveSearchEngine";

export const FilterSettingsView = async (
  filterSettings: BaseFilterSettings | LocalFilterSetting,
  containerEl: HTMLElement,
  settingManager: GraphSettingManager
) => {
  const graphView = settingManager.getGraphView();
  const searchInput = await addSearchInput(
    containerEl,
    filterSettings.searchQuery,
    (value) => {
      //update the current setting of the plugin
      settingManager.updateCurrentSettings((setting) => {
        setting.value.filter.searchQuery = value;
      });
    },
    graphView
  );

  // if this is a built-in search input, then we need to add a mutation observer
  if (
    searchInput &&
    settingManager.getGraphView().plugin.fileManager.searchEngine instanceof PassiveSearchEngine
  )
    searchInput.addMutationObserver((files) => {
      // the files is empty, by default, we will show all files
      settingManager.searchResult.value.filter.files = files.map((file) => ({
        name: file.name,
        path: file.path,
      }));
    });

  // add show attachments setting
  new Setting(containerEl).setName("Show Attachments").addToggle((toggle) => {
    toggle.setValue(filterSettings.showAttachments || false).onChange(async (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.filter.showAttachments = value;
      });
    });
  });

  // add show orphans setting
  new Setting(containerEl).setName("Show Orphans").addToggle((toggle) => {
    toggle.setValue(filterSettings.showOrphans || false).onChange(async (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.filter.showOrphans = value;
      });
    });
  });

  if (graphView.graphType === GraphType.local) {
    const localFilterSettings = filterSettings as LocalFilterSetting;
    //  add a slider for the depth
    new Setting(containerEl).setName("Depth").addSlider((slider) => {
      slider
        .setLimits(1, 5, 1)
        .setValue(localFilterSettings.depth)
        .setDynamicTooltip()
        .onChange(async (value) => {
          settingManager.updateCurrentSettings((setting: State<LocalGraphSettings>) => {
            setting.value.filter.depth = value;
          });
        });
    });

    // add dropdown show incoming links setting
    new Setting(containerEl).setName("Show Incoming Links").addDropdown((dropdown) => {
      dropdown
        .addOptions({
          both: "Both",
          inlinks: "Inlinks",
          outlinks: "Outlinks",
        })
        .setValue(localFilterSettings.linkType)
        .onChange(async (value: "both" | "inlinks" | "outlinks") => {
          // update the setting
          settingManager.updateCurrentSettings((setting: State<LocalGraphSettings>) => {
            setting.value.filter.linkType = value;
            // we are putting false here because we know there are still some more to update
          }, false);

          if (value === "both") settingManager.displaySettingView.hideDagOrientationSetting();
          else if (settingManager.displaySettingView.isDropdownHidden())
            settingManager.displaySettingView.showDagOrientationSetting();
        });
    });
  }
  const triggerSearch = async () => {
    searchInput?.triggerSearch();
  };

  return {
    searchInput,
    triggerSearch,
  };
};
