import { GroupSettings } from "@/settings/categories/GroupSettings";
import { NodeGroup } from "@/graph/NodeGroup";
import { State } from "@/util/State";
import { AddNodeGroupItem } from "@/views/settings/categories/GroupSettingItem";
import { Graph3dView } from "@/views/graph/Graph3dView";

export const addNodeGroups = async (
  groupSettings: State<GroupSettings>,
  containerEl: HTMLElement,
  view: Graph3dView
) => {
  const plugin = view.plugin;
  containerEl.querySelector(".node-group-container")?.remove();
  const nodeGroupContainerEl = containerEl.createDiv({
    cls: "graph-color-groups-container",
  });
  groupSettings.value.groups.forEach(async (group, index) => {
    const groupState = groupSettings.createSubState(`value.groups.${index}`, NodeGroup);
    await AddNodeGroupItem(
      groupState,
      nodeGroupContainerEl,
      () => {
        // remove from group settings and search state
        groupSettings.value.groups.splice(index, 1);
        plugin.searchState.value.group.splice(index, 1);
      },
      view,
      index
    );
  });
};
