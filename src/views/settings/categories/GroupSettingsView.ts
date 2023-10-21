import { GroupSettings } from "@/settings/categories/GroupSettings";
import { State, StateChange } from "@/util/State";
import { addNodeGroups } from "@/views/settings/categories/addNodeGroups";
import { addNodeGroupButton } from "@/views/settings/categories/AddNodeGroupButton";
import { Graph3dView } from "@/views/graph/Graph3dView";

export const GroupSettingsView = async (
  groupSettings: State<GroupSettings>,
  containerEl: HTMLElement,
  view: Graph3dView
) => {
  // add the nodeGroups
  await addNodeGroups(groupSettings, containerEl, view);
  addNodeGroupButton(groupSettings, containerEl, view);

  groupSettings.onChange(async (change: StateChange) => {
    if ((change.currentPath === "groups" && change.type === "add") || change.type === "delete") {
      containerEl.empty();
      await addNodeGroups(groupSettings, containerEl, view);
      addNodeGroupButton(groupSettings, containerEl, view);
    }
  });
};
