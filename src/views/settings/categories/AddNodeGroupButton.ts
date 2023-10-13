import { ButtonComponent } from "obsidian";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { NodeGroup } from "@/graph/NodeGroup";
import { ObsidianTheme } from "@/util/ObsidianTheme";
import { State } from "@/util/State";
import { GroupSettingsView } from "@/views/settings/categories/GroupSettingsView";

export const addNodeGroupButton = (
  groupSettings: State<GroupSettings>,
  containerEl: HTMLElement,
  theme: ObsidianTheme
) => {
  containerEl.querySelector(".graph-color-button-container")?.remove();

  const buttonContainer = containerEl.createDiv({
    cls: "graph-color-button-container",
  });

  new ButtonComponent(buttonContainer)
    .setClass("mod-cta")
    .setButtonText("Add Group")
    .onClick(() => {
      groupSettings.value.groups.push(new NodeGroup("", theme.textMuted));
      containerEl.empty();
      GroupSettingsView(groupSettings, containerEl, theme);
    });
};
