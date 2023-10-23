import { Setting } from "obsidian";

import { addSearchInput } from "@/views/atomics/addSearchInput";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { BaseFilterSettings, LocalFilterSetting, LocalGraphSettings } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";

export const FilterSettingsView = async (
  filterSettings: BaseFilterSettings | LocalFilterSetting,
  containerEl: HTMLElement,
  settingManager: NewGraph3dView["settingManager"]
) => {
  const graphView = settingManager.getGraphView();
  const plugin = graphView.plugin;
  await addSearchInput(
    containerEl,
    filterSettings.searchQuery,
    (value) => {
      //update the current setting of the plugin
      settingManager.updateCurrentSettings((setting) => {
        setting.filter.searchQuery = value;
        return setting;
      });
    },
    plugin
  );

  // add show attachments setting
  new Setting(containerEl).setName("Show Attachments").addToggle((toggle) => {
    toggle.setValue(filterSettings.showAttachments || false).onChange(async (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.filter.showAttachments = value;
        return setting;
      });
    });
  });

  // add show orphans setting
  new Setting(containerEl).setName("Show Orphans").addToggle((toggle) => {
    toggle.setValue(filterSettings.showOrphans || false).onChange(async (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.filter.showOrphans = value;
        return setting;
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
          settingManager.updateCurrentSettings((setting: LocalGraphSettings) => {
            setting.filter.depth = value;
            return setting;
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
          settingManager.updateCurrentSettings((setting: LocalGraphSettings) => {
            setting.filter.linkType = value;
            return setting;
          });

          if (value === "both") settingManager.displaySettingView.hideDagOrientationSetting();
          else if (settingManager.displaySettingView.isDropdownHidden())
            settingManager.displaySettingView.showDagOrientationSetting();
        });
    });
  }
};
