import { addNodeGroups } from "@/views/settings/categories/addNodeGroups";
import { addNodeGroupButton } from "@/views/settings/categories/AddNodeGroupButton";
import { GroupSettings } from "@/SettingManager";
import { Graph3dView } from "@/views/graph/Graph3dView";

export const GroupSettingsView = async (
  groupSettings: GroupSettings,
  containerEl: HTMLElement,
  view: Graph3dView
) => {
  await addNodeGroups(groupSettings, containerEl, view);
  addNodeGroupButton(containerEl, view);
};
