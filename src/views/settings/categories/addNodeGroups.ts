import { GroupSettings } from "@/settings/categories/GroupSettings";
import { NodeGroup } from "@/graph/NodeGroup";
import { State } from "@/util/State";
import { AddNodeGroupItem } from "@/views/settings/categories/GroupSettingItem";

export const addNodeGroups = (groupSettings: State<GroupSettings>, containerEl: HTMLElement) => {
  containerEl.querySelector(".node-group-container")?.remove();
  const nodeGroupContainerEl = containerEl.createDiv({
    cls: "graph-color-groups-container",
  });
  groupSettings.value.groups.forEach((group, index) => {
    const groupState = groupSettings.createSubState(`value.groups.${index}`, NodeGroup);
    AddNodeGroupItem(groupState, nodeGroupContainerEl, () => {
      groupSettings.value.groups.splice(index, 1);
    });
  });
};
