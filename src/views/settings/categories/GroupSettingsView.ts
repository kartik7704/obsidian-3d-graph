import { addNodeGroups } from "@/views/settings/categories/addNodeGroups";
import { addNodeGroupButton } from "@/views/settings/categories/AddNodeGroupButton";
import { Graph3dView } from "@/views/graph/3dView/Graph3dView";
import { addSearchInput } from "@/views/atomics/addSearchInput";
import { GroupSettings } from "@/SettingsSchemas";

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
    searchInputs,
    triggerSearch,
  };
};
