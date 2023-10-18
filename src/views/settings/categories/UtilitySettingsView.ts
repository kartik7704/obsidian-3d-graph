import { ButtonComponent } from "obsidian";
import Graph3dPlugin from "@/main";
import { eventBus } from "@/util/EventBus";

export const UtilitySettingsView = async (containerEl: HTMLElement, plugin: Graph3dPlugin) => {
  new ButtonComponent(containerEl).setButtonText("Search").onClick(() => {
    const switcherInstance = plugin.app.internalPlugins.plugins.switcher.instance;
    // you need the options to open quick switcher, https://github.com/darlal/obsidian-switcher-plus/blob/2a1a8ccb0ca955397aa7516b746853427f5483ec/src/settings/switcherPlusSettings.ts#L132-L134
    const modal = new switcherInstance.QuickSwitcherModal(
      plugin.app,
      // @ts-ignore
      switcherInstance.options
    );
    modal.onChooseSuggestion = (file, evt) => {
      eventBus.trigger("search", file, evt);
    };
    modal.open();
  });
};
