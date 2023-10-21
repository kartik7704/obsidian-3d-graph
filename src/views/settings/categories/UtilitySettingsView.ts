import { App, ButtonComponent } from "obsidian";
import { eventBus } from "@/util/EventBus";
import { Graph3dView } from "@/views/graph/Graph3dView";
import Graph3dPlugin from "@/main";

export const UtilitySettingsView = async (containerEl: HTMLElement, view: Graph3dView) => {
  const plugin = view.plugin;

  const div = containerEl.createDiv();

  // set the containerEl to have flex col space 4px between items
  div.style.display = "flex";
  div.style.flexDirection = "column";
  div.style.gap = "4px";

  new ButtonComponent(div).setButtonText("Search").onClick(() => {
    const switcherInstance = plugin.app.internalPlugins.plugins.switcher.instance;
    const QuickSwitcherModal = switcherInstance?.QuickSwitcherModal;
    if (!QuickSwitcherModal) return;
    // you need the options to open quick switcher, https://github.com/darlal/obsidian-switcher-plus/blob/2a1a8ccb0ca955397aa7516b746853427f5483ec/src/settings/switcherPlusSettings.ts#L132-L134

    const MySwitcher = class extends QuickSwitcherModal {
      constructor(app: App, public plugin: Graph3dPlugin) {
        // @ts-ignore
        super(app, switcherInstance.options);
      }

      async getSuggestions(query: string) {
        const suggestions = await super.getSuggestions(query);
        const allFilePaths = view
          .getForceGraph()
          ?.getGraph()
          .nodes.map((n) => n.path);
        return suggestions.filter(Boolean).filter((s) => {
          // only show files in this view
          return s.file ? allFilePaths?.includes(s.file.path) : false;
        });
      }
    };

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
