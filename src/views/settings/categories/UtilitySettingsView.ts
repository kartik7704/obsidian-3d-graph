import { ButtonComponent } from "obsidian";
import { eventBus } from "@/util/EventBus";
import { GlobalGraph3dView } from "@/views/graph/GlobalGraph3dView";
import { getMySwitcher } from "@/views/settings/categories/getMySwitcher";

export const UtilitySettingsView = async (containerEl: HTMLElement, view: GlobalGraph3dView) => {
  const plugin = view.plugin;

  const div = containerEl.createDiv();

  // set the containerEl to have flex col space 4px between items
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.gap = "4px";

  new ButtonComponent(div).setButtonText("Search").onClick(() => {
    const MySwitcher = getMySwitcher(view);

    if (MySwitcher === undefined) return;
    const modal = new MySwitcher(plugin.app, plugin);
    modal.onChooseSuggestion = (file, evt) => {
      // @ts-ignore
      view.getForceGraph()?.search(file.file, evt);
    };
    modal.open();
  });

  new ButtonComponent(div).setButtonText("Look at center").onClick(() => {
    // TODO: change all event to enum
    eventBus.trigger("look-at-center");
  });

  new ButtonComponent(div).setButtonText("Remove selection").onClick(() => {
    eventBus.trigger("remove-selected-nodes");
  });
};
