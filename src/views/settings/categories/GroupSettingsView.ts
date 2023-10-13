import { GroupSettings } from "@/settings/categories/GroupSettings";
import { ObsidianTheme } from "@/util/ObsidianTheme";
import { State, StateChange } from "@/util/State";
import { addNodeGroups } from "@/views/settings/categories/addNodeGroups";
import { addNodeGroupButton } from "@/views/settings/categories/AddNodeGroupButton";

export const GroupSettingsView = (
  groupSettings: State<GroupSettings>,
  containerEl: HTMLElement,
  theme: ObsidianTheme
) => {
  // add the nodeGroups
  addNodeGroups(groupSettings, containerEl);
  addNodeGroupButton(groupSettings, containerEl, theme);
  groupSettings.onChange((change: StateChange) => {
    if ((change.currentPath === "groups" && change.type === "add") || change.type === "delete") {
      containerEl.empty();
      addNodeGroups(groupSettings, containerEl);
      addNodeGroupButton(groupSettings, containerEl, theme);
    }
  });
};
