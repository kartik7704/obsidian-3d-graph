import type { BaseGraph3dView } from "@/views/graph/3dView/Graph3dView";
import { addSavedLayoutGroupItem } from "@/views/settings/categories/SavedLayoutGroupItem";
import { Setting } from "obsidian";

export const SavedLayoutsView = (containerEl: HTMLElement, view: BaseGraph3dView) => {
  const div = containerEl.createDiv({
    cls: "saved-layouts-view",
    attr: {
      style: "display: flex; flex-direction: column; gap: 4px;",
    },
  });

  view.plugin.nodePositionManager.getLayouts().forEach((layout) => {
    addSavedLayoutGroupItem(div, layout, view);
  });

  const _button = new Setting(div).addButton((button) => {
    button.setButtonText("Save current layout").onClick(async () => {
      const layout = await view.plugin.nodePositionManager.saveLayout("New");
      addSavedLayoutGroupItem(div, layout, view);
      div.append(_button.settingEl);
    });
  });
};
