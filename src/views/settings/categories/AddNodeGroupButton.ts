import { ButtonComponent } from "obsidian";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { NodeGroup } from "@/graph/NodeGroup";
import { State } from "@/util/State";
import { GroupSettingsView } from "@/views/settings/categories/GroupSettingsView";
import { Graph3dView } from "@/views/graph/Graph3dView";

const getRandomColor = () => {
  return "#" + Math.floor(Math.random() * 16777215).toString(16);
};

export const addNodeGroupButton = (
  groupSettings: State<GroupSettings>,
  containerEl: HTMLElement,
  view: Graph3dView
) => {
  containerEl.querySelector(".graph-color-button-container")?.remove();

  const buttonContainer = containerEl.createDiv({
    cls: "graph-color-button-container",
  });

  new ButtonComponent(buttonContainer)
    .setClass("mod-cta")
    .setButtonText("Add Group")
    .onClick(() => {
      groupSettings.value.groups.push(new NodeGroup("", getRandomColor()));
      containerEl.empty();
      GroupSettingsView(groupSettings, containerEl, view);
    });
};
