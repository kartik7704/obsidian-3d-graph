import { GroupSettings } from "@/SettingManager";
import { AddNodeGroupItem } from "@/views/settings/categories/AddGroupSettingItem";
import { Graph3dView } from "@/views/graph/Graph3dView";

export const addNodeGroups = async (
  groupSettings: GroupSettings,
  containerEl: HTMLElement,
  view: Graph3dView
) => {
  containerEl.querySelector(".node-group-container")?.remove();
  const nodeGroupContainerEl = containerEl.createDiv({
    cls: "graph-color-groups-container",
  });
  groupSettings.forEach(async (group, index) => {
    await AddNodeGroupItem(group, nodeGroupContainerEl, view, index);
  });
};
