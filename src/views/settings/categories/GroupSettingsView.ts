import { addNodeGroups } from "@/views/settings/categories/addNodeGroups";
import { addNodeGroupButton } from "@/views/settings/categories/AddNodeGroupButton";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { GroupSettings } from "@/SettingManager";

export const GroupSettingsView = async (
  groupSettings: GroupSettings,
  containerEl: HTMLElement,
  view: NewGraph3dView
) => {
  await addNodeGroups(groupSettings, containerEl, view);
  addNodeGroupButton(groupSettings, containerEl, view);
};
