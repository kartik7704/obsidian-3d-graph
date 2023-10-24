import { ButtonComponent } from "obsidian";
import { GroupSettings } from "@/SettingManager";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { AddNodeGroupItem } from "@/views/settings/categories/AddGroupSettingItem";

const getRandomColor = () => {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
};

export const addNodeGroupButton = (
  groupSettings: GroupSettings,
  containerEl: HTMLElement,
  view: NewGraph3dView
) => {
  // make sure there is only one button
  containerEl.querySelector(".graph-color-button-container")?.remove();

  const buttonContainerEl = containerEl.createDiv({
    cls: "graph-color-button-container",
  });

  new ButtonComponent(buttonContainerEl)
    .setClass("mod-cta")
    .setButtonText("Add Group")
    .onClick(() => {
      const newGroup = {
        query: "",
        color: getRandomColor(),
      };
      // add a group to group settings
      view.settingManager.updateCurrentSettings((setting) => {
        setting.groups.push(newGroup);
        // add a group to UI as well, add it in the containerEl before the button container el
        return setting;
      });
      // we need to get the latest current setting so that index will be correct
      const index = view.settingManager.getCurrentSetting().groups.length - 1;
      AddNodeGroupItem(newGroup, containerEl, view, index);
      containerEl.append(buttonContainerEl);
    });
};
