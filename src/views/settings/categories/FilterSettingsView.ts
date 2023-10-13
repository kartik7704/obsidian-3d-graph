import { App, Notice, Setting, Plugin } from "obsidian";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { State } from "@/util/State";

interface GlobalSearchPlugin extends Plugin {
  instance: {
    getGlobalSearchQuery: () => string;
    openGlobalSearch: (query: string) => void;
  };
}

export const FilterSettingsView = (
  filterSettings: State<FilterSettings>,
  containerEl: HTMLElement,
  app: App
) => {
  const instance = (app.internalPlugins.plugins["global-search"] as GlobalSearchPlugin).instance;
  // add search setting
  new Setting(containerEl)
    .setClass("mod-search-setting")
    .addSearch((search) => {
      // initialize search with current search query
      search.inputEl.value = filterSettings.value.searchQuery;
      filterSettings.onChange((change) => {
        if (change.currentPath === "searchQuery") {
          search.inputEl.value = change.newValue as string;
        }
      });
      search.setPlaceholder("Read only");
      search.inputEl.onclick = (e) => {
        new Notice("This search is delegated to the global search plugin");
        const currentSearch = instance.getGlobalSearchQuery();
        instance.openGlobalSearch(currentSearch);
      };
      search.clearButtonEl.onclick = (e) => {
        filterSettings.value.searchQuery = "";
        filterSettings.value.searchResult = [];
      };
      search.inputEl.readOnly = true;
      return search;
    })
    .addButton((button) => {
      button.setButtonText("Search").onClick(async (e) => {
        const currentSearch = instance.getGlobalSearchQuery();
        instance.openGlobalSearch(currentSearch);
        const searchLeaf = app.workspace.getLeavesOfType("search")[0];
        if (searchLeaf) {
          filterSettings.value.searchQuery = instance.getGlobalSearchQuery();
          const search = await searchLeaf.open(searchLeaf.view);
          const rawSearchResult = await new Promise((resolve) =>
            setTimeout(() => {
              // @ts-ignore
              resolve(search.dom.resultDomLookup);
            }, 300)
          );
          // @ts-ignore
          const files = Array.from(rawSearchResult.keys());
          console.log(files);
          // @ts-ignore
          filterSettings.value.searchResult = files.map((f) => f.path as string);
          console.log(filterSettings.value.searchResult);
        } else {
          new Notice("Please open your search leaf first");
        }
      });
    });

  // add show attachments setting
  new Setting(containerEl).setName("Show Attachments").addToggle((toggle) => {
    toggle.setValue(filterSettings.value.showAttachments || false).onChange(async (value) => {
      filterSettings.value.showAttachments = value;
    });
  });

  // add show orphans setting
  new Setting(containerEl).setName("Show Orphans").addToggle((toggle) => {
    toggle.setValue(filterSettings.value.showOrphans || false).onChange(async (value) => {
      filterSettings.value.showOrphans = value;
    });
  });
};
