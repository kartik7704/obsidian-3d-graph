import { App } from "obsidian";
import Graph3dPlugin from "@/main";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { QuickSwitcherPlugin } from "@/typings/types-obsidian";

export const getMySwitcher = (view: NewGraph3dView) => {
  const switcherInstance = (view.plugin.app.internalPlugins.plugins.switcher as QuickSwitcherPlugin)
    .instance;
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
        .instance.graphData()
        .nodes.map((n) => n.path);
      return suggestions.filter(Boolean).filter((s) => {
        // only show files in this view
        return s.file ? allFilePaths?.includes(s.file.path) : false;
      });
    }
  };
  return MySwitcher;
};
