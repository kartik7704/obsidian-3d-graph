import { SavedSetting } from "@/SettingManager";
import { createNotice } from "@/util/createNotice";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { ExtraButtonComponent, TextComponent } from "obsidian";

/**
 * given a container element, add a new setting group item to it
 */
export const addSaveSettingGroupItem = (
  containerEl: HTMLDivElement,
  savedSetting: SavedSetting,
  view: NewGraph3dView
) => {
  // create a new div element
  const innerEl = containerEl.createDiv({
    attr: {
      style:
        "display: flex; flex-direction: row; justify-content: space-between; align-items: center;",
    },
  });

  // create a new input element in the div element
  const nameSetting = new TextComponent(innerEl);
  nameSetting.setValue(savedSetting.title).onChange(async (value) => {
    //  TODO: change the setting group name
    view.plugin.settingManager.updateSettings((settings) => {
      const setting = settings.savedSettings.find((setting) => setting.id === savedSetting.id);
      if (setting) {
        setting.title = value;
      }
      return settings;
    });
  });

  const checkButton = new ExtraButtonComponent(innerEl);
  checkButton
    .setIcon("undo-2")
    .setTooltip("Apply")
    .onClick(async () => {
      view.settingManager.applySettings(savedSetting.setting);
    });

  const updateButton = new ExtraButtonComponent(innerEl);
  updateButton
    .setIcon("pencil")
    .setTooltip("Update")
    .onClick(async () => {
      if (confirm(`Are you sure you want to update: ${savedSetting.title}?`)) {
        createNotice(`Updating saved settings ${savedSetting.title}`);

        // update the setting
        view.plugin.settingManager.updateSettings((settings) => {
          const setting = settings.savedSettings.find((setting) => setting.id === savedSetting.id);
          if (setting) {
            setting.setting = view.settingManager.getCurrentSetting();
          }
          return settings;
        });
      }
    });

  const trashButton = new ExtraButtonComponent(innerEl);
  trashButton
    .setIcon("trash")
    .setTooltip("Delete")
    .onClick(async () => {
      if (confirm(`Are you sure you want to delete: ${savedSetting.title}?`)) {
        // remove from UI
        innerEl.remove();

        // remove from settings
        view.plugin.settingManager.updateSettings((settings) => {
          settings.savedSettings = settings.savedSettings.filter(
            (setting) => setting.id !== savedSetting.id
          );
          return settings;
        });
      }
    });
  trashButton.extraSettingsEl.style.color = "red";
};
