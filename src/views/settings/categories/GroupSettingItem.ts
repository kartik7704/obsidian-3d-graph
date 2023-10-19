import { ExtraButtonComponent } from "obsidian";
import { NodeGroup } from "@/graph/NodeGroup";
import { State } from "@/util/State";
import { addColorPicker } from "@/views/atomics/addColorPicker";
import { addSearchInput } from "@/views/atomics/addSearchInput";
import { Graph3dView } from "@/views/graph/Graph3dView";

/**
 * given a group and a container element, create a group setting item
 */
export const AddNodeGroupItem = async (
  group: State<NodeGroup>,
  containerEl: HTMLElement,
  onDelete: () => void,
  view: Graph3dView,
  index: number
) => {
  const plugin = view.plugin;
  const groupEl = containerEl.createDiv({ cls: "graph-color-group" });

  const [_, triggerSearch] = await addSearchInput(
    groupEl,
    group.value.query,
    (value, files) => {
      group.value.query = value;
      // they must exist
      plugin.searchState.value.group[index]!.query = value;
      plugin.searchState.value.group[index]!.files = files;
    },
    plugin
  );
  view.searchTriggers[`group-${index}`] = triggerSearch;

  addColorPicker(groupEl, group.value.color, (value) => {
    group.value.color = value;
  });

  new ExtraButtonComponent(groupEl).setIcon("cross").setTooltip("Delete Group").onClick(onDelete);
};
