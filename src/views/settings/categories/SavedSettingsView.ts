import { SavedSetting } from "@/SettingManager";
import { generateUUID } from "@/util/generateUUID";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { addSaveSettingGroupItem } from "@/views/settings/categories/SaveSettingGroupItem";
import { Setting } from "obsidian";

export const SavedSettingsView = (containerEl: HTMLElement, view: NewGraph3dView) => {
  const div = containerEl.createDiv({
    cls: "saved-settings-view",
    attr: {
      style: "display: flex; flex-direction: column; gap: 4px;",
    },
  });

  // render all saved settings
  view.plugin.settingManager
    .getSettings()
    .savedSettings.filter((setting) => setting.type === view.graphType)
    .forEach((setting) => {
      addSaveSettingGroupItem(div, setting, view);
    });

  //   add a button element to the div element
  const _button = new Setting(div).addButton((button) => {
    button.setButtonText("Save current settings").onClick(async () => {
      const newSetting = {
        id: generateUUID(),
        title: "New",
        setting: view.settingManager.getCurrentSetting(),
        type: view.graphType,
      } as SavedSetting;

      // add a new saved setting item to the div element
      addSaveSettingGroupItem(div, newSetting, view);

      // move the button to the bottom of the div element
      div.append(_button.settingEl);

      // update the settings
      view.plugin.settingManager.updateSettings((settings) => {
        settings.savedSettings.push(newSetting);
        return settings;
      });
    });
  });
};
