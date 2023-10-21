import { Setting } from "obsidian";

type SettingGroup = {
  name: string;
};

/**
 * given a container element, add a new setting group item to it
 */
export const addSaveSettingGroupItem = (containerEl: HTMLDivElement, group: SettingGroup) => {
  // create a new div element
  const newDiv = containerEl.createDiv({
    attr: {
      style:
        "display: flex; flex-direction: row; justify-content: space-between; align-items: center;",
    },
  });

  // create a new input element in the div element
  const nameSetting = new Setting(newDiv).addText((text) => {
    text.setValue(group.name).onChange(async (value) => {
      //  TODO: change the setting group name
    });
  });
  nameSetting.infoEl?.remove();

  // create a button element in the div element
  const checkButton = new Setting(newDiv).addExtraButton((button) => {
    button
      .setIcon("check")
      .setTooltip("Apply")
      .onClick(async () => {
        // TODO: apply this setting group
      });
  });
  checkButton.infoEl?.remove();

  // create another button element in the div element
  const trashButton = new Setting(newDiv).addExtraButton((button) => {
    button
      .setIcon("trash")
      .setTooltip("Delete")
      .onClick(async () => {
        // TODO: delete the setting group
        newDiv.remove();
      });
    button.extraSettingsEl.style.color = "red";
  });
  trashButton.infoEl?.remove();
};
