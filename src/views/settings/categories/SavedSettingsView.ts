import { Graph3dView } from "@/views/graph/Graph3dView";
import { addSaveSettingGroupItem } from "@/views/settings/categories/SaveSettingGroupItem";
import { Setting } from "obsidian";

export const SavedSettingsView = (containerEl: HTMLElement, view: Graph3dView) => {
  const div = containerEl.createDiv({
    cls: "saved-settings-view",
    attr: {
      style: "display: flex; flex-direction: column; gap: 4px;",
    },
  });

  //   add three saved setting items to the div element

  addSaveSettingGroupItem(div, {
    name: "Default",
  });

  addSaveSettingGroupItem(div, {
    name: "Dark",
  });

  addSaveSettingGroupItem(div, {
    name: "Light",
  });

  //   add a button element to the div element
  const _button = new Setting(div).addButton((button) => {
    button.setButtonText("Save current settings").onClick(async () => {
      // add a new saved setting item to the div element
      addSaveSettingGroupItem(div, {
        name: "New",
      });
      // move the button to the bottom of the div element
      div.append(_button.settingEl);
    });
  });
};
