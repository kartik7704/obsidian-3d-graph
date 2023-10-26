import { addNodeGroups } from "@/views/settings/categories/addNodeGroups";
import { addNodeGroupButton } from "@/views/settings/categories/AddNodeGroupButton";
import { GroupSettings } from "@/SettingManager";
import { Graph3dView } from "@/views/graph/Graph3dView";
import { addSearchInput } from "@/views/atomics/addSearchInput";

export const GroupSettingsView = async (
  groupSettings: GroupSettings,
  containerEl: HTMLElement,
  view: Graph3dView
) => {
  const searchInputs: Awaited<ReturnType<typeof addSearchInput>>[] = [];
  await addNodeGroups(groupSettings, containerEl, view, searchInputs);
  addNodeGroupButton(containerEl, view, searchInputs);

  const triggerSearch = () => {
    searchInputs.forEach((nodeGroup) => {
      nodeGroup?.triggerSearch();
    });
  };

  return {
    triggerSearch,
  };
};
