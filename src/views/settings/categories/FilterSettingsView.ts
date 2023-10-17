import { SearchView, Setting, TFile } from "obsidian";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { State } from "@/util/State";
import { spawnLeafView } from "@/views/leafView";
import Graph3dPlugin from "@/main";

const DomLookUpTime = 300;

export const FilterSettingsView = async (
  filterSettings: State<FilterSettings>,
  containerEl: HTMLElement,
  plugin: Graph3dPlugin
) => {
  const searchEl = containerEl.createDiv({
    // cls :
  });
  const [searchLeaf] = spawnLeafView(plugin, searchEl);

  await searchLeaf.setViewState({
    type: "search",
  });

  // add searchEl to containerEl
  containerEl.appendChild(searchEl);

  const element = searchLeaf.containerEl.querySelector(
    ".workspace-leaf-content[data-type='search']"
  ) as HTMLDivElement;
  // element.style.removeProperty("overflow");
  const searchRowEl = element.querySelector(".search-row") as HTMLDivElement;
  searchRowEl.style.margin = "0px";
  console.log(element);
  // move the element to the containerEl
  containerEl.appendChild(searchRowEl);
  const inputEl = searchRowEl.getElementsByTagName("input")[0]!;
  const settingIconEl = searchRowEl.querySelector(
    ".clickable-icon[aria-label='Search settings']"
  ) as HTMLDivElement;
  const matchCaseIconEl = searchRowEl.querySelector(
    "div.search-input-container > div[aria-label='Match case'] "
  ) as HTMLDivElement;
  const clearButtonEl = searchRowEl.querySelector(".search-input-clear-button") as HTMLDivElement;
  settingIconEl?.remove();
  matchCaseIconEl?.remove();
  console.log(settingIconEl);
  inputEl.value = filterSettings.value.searchQuery;
  inputEl.onkeydown = async (e) => {
    const currentView = searchLeaf.view as SearchView;
    const rawSearchResult = await new Promise((resolve) =>
      setTimeout(() => {
        // @ts-ignore
        resolve(currentView.dom.resultDomLookup);
      }, DomLookUpTime)
    );
    // @ts-ignore
    const files = Array.from(rawSearchResult.keys()) as TFile[];

    filterSettings.value.searchResult = files.map((f) => f.path);
    filterSettings.value.searchQuery = inputEl.value;
  };

  clearButtonEl.onclick = async () => {
    filterSettings.value.searchQuery = "";
    filterSettings.value.searchResult = [];
  };

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
