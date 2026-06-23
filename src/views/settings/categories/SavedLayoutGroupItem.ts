import type { SavedLayout } from "@/NodePositionManager";
import { createNotice } from "@/util/createNotice";
import type { BaseGraph3dView } from "@/views/graph/3dView/Graph3dView";
import { ExtraButtonComponent, TextComponent } from "obsidian";

export const addSavedLayoutGroupItem = (
  containerEl: HTMLDivElement,
  layout: SavedLayout,
  view: BaseGraph3dView
) => {
  const innerEl = containerEl.createDiv({
    attr: {
      style:
        "display: flex; flex-direction: row; justify-content: space-between; align-items: center;",
    },
  });

  const nameSetting = new TextComponent(innerEl);
  nameSetting.setValue(layout.title).onChange(async (value) => {
    await view.plugin.nodePositionManager.renameLayout(layout.id, value);
    layout.title = value;
  });

  new ExtraButtonComponent(innerEl)
    .setIcon("undo-2")
    .setTooltip("Apply")
    .onClick(() => {
      const positions = view.plugin.nodePositionManager.applyLayoutToCurrent(layout.id);
      if (positions) view.getForceGraph()?.applyLivePositions(positions);
    });

  new ExtraButtonComponent(innerEl)
    .setIcon("pencil")
    .setTooltip("Update with current positions")
    .onClick(async () => {
      if (confirm(`Update "${layout.title}" with current node positions?`)) {
        await view.plugin.nodePositionManager.updateLayout(layout.id);
        createNotice(`Layout "${layout.title}" updated`);
      }
    });

  const trashButton = new ExtraButtonComponent(innerEl)
    .setIcon("trash")
    .setTooltip("Delete")
    .onClick(async () => {
      if (confirm(`Delete layout "${layout.title}"?`)) {
        innerEl.remove();
        await view.plugin.nodePositionManager.deleteLayout(layout.id);
      }
    });
  trashButton.extraSettingsEl.style.color = "red";
};
