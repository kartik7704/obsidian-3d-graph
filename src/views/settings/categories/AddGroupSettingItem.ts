import { ExtraButtonComponent } from "obsidian";
import { addColorPicker } from "@/views/atomics/addColorPicker";
import { addSearchInput } from "@/views/atomics/addSearchInput";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { GroupSettings } from "@/SettingManager";

/**
 * given a group and a container element,
 * create a group setting item inside the container element
 */
export const AddNodeGroupItem = async (
  newGroup: GroupSettings[number],
  containerEl: HTMLElement,
  view: NewGraph3dView,
  /**
   * the index of this group
   */
  index: number
) => {
  // This group must exist
  const groupEl = containerEl.createDiv({ cls: "graph-color-group" });

  const searchInput = await addSearchInput(
    groupEl,
    newGroup.query,
    (value) => {
      view.settingManager.updateCurrentSettings((setting) => {
        // This group must exist
        setting.groups[index]!.query = value;
        return setting;
      });
    },
    view
  );

  if (searchInput)
    searchInput.addMutationObserver((files) => {
      console.log("set the graph config", files);
    });

  addColorPicker(groupEl, newGroup.color, (value) => {
    view.settingManager.updateCurrentSettings((setting) => {
      // This group must exist
      setting.groups[index]!.color = value;
      return setting;
    });
  });

  new ExtraButtonComponent(groupEl)
    .setIcon("cross")
    .setTooltip("Delete Group")
    .onClick(() => {
      // remove itself from the UI
      groupEl.remove();

      // remove from setting
      view.settingManager.updateCurrentSettings((setting) => {
        setting.groups.splice(index, 1);
        return setting;
      });
    });
};
