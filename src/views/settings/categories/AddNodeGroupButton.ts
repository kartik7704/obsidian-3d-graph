import { ButtonComponent } from "obsidian";
import { AddNodeGroupItem } from "@/views/settings/categories/AddGroupSettingItem";
import { Graph3dView } from "@/views/graph/Graph3dView";

const getRandomColor = () => {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
};

export const addNodeGroupButton = (containerEl: HTMLElement, view: Graph3dView) => {
  // make sure there is only one button
  containerEl.querySelector(".graph-color-button-container")?.remove();

  const buttonContainerEl = containerEl.createDiv({
    cls: "graph-color-button-container",
  });

  new ButtonComponent(buttonContainerEl)
    .setClass("mod-cta")
    .setButtonText("Add Group")
    .onClick(async () => {
      const newGroup = {
        query: "",
        color: getRandomColor(),
      };
      // add a group to group settings
      view.settingManager.updateCurrentSettings((setting) => {
        setting.value.groups.push(newGroup);
        // add a group to UI as well, add it in the containerEl before the button container el
      });

      // we need to get the latest current setting so that index will be correct
      const index = view.settingManager.getCurrentSetting().groups.length - 1;
      // add a group to search result as well
      view.settingManager.searchResult.value.groups[index] = {
        files: [],
      };
      await AddNodeGroupItem(newGroup, containerEl, view, index);
      containerEl.append(buttonContainerEl);
    });
};
