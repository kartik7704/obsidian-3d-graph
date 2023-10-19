import Graph3dPlugin from "@/main";
import { eventBus } from "@/util/EventBus";
import { spawnLeafView } from "@/views/leafView";
import { SearchView, TFile } from "obsidian";
import { pick } from "radash";

const DomLookUpTime = 300;

export type SearchResultFile = ReturnType<typeof getFilesFromSearchResult>[0];

const getFilesFromSearchResult = (rawSearchResult: unknown) => {
  // @ts-ignore
  return (Array.from(rawSearchResult.keys()) as TFile[]).map((f) => {
    return {
      ...pick(f, ["basename", "extension", "name", "path", "stat"]),
    };
  });
};

const getResultFromSearchView = async (searchView: SearchView) => {
  return await new Promise((resolve) =>
    setTimeout(() => {
      // @ts-ignore
      resolve(searchView.dom.resultDomLookup);
    }, DomLookUpTime)
  );
};

export const addSearchInput = async (
  containerEl: HTMLElement,
  /**
   * the current value
   */
  value: string,
  /**
   * callback for when the value is changed
   */
  onChange: (value: string, files: SearchResultFile[], init?: boolean) => void,
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

  const searchElement = searchLeaf.containerEl.querySelector(
    ".workspace-leaf-content[data-type='search']"
  ) as HTMLDivElement;
  // element.style.removeProperty("overflow");
  const searchRowEl = searchElement.querySelector(".search-row") as HTMLDivElement;
  const searchResultContainerEl = searchElement.querySelector(
    ".search-result-container"
  ) as HTMLDivElement;
  const searchResultInfoEl = searchElement.querySelector(".search-results-info") as HTMLDivElement;
  const parentEl = searchResultContainerEl.parentElement!;
  searchResultContainerEl.style.visibility = "hidden";
  searchResultContainerEl.style.height = "0px";
  searchResultContainerEl.style.position = "absolute";
  searchResultInfoEl.style.visibility = "hidden";
  searchResultInfoEl.style.height = "0px";
  searchResultInfoEl.style.position = "absolute";
  searchRowEl.style.margin = "0px";
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
  inputEl.value = value;
  const currentView = searchLeaf.view as SearchView;
  inputEl.onkeydown = async (e) => {
    const rawSearchResult = await getResultFromSearchView(currentView);
    // @ts-ignore
    const files = getFilesFromSearchResult(rawSearchResult);
    onChange(inputEl.value, files);
  };

  clearButtonEl.onclick = () => {
    onChange("", []);
  };

  const triggerSearch = async () => {
    plugin.activeGraphView.containerEl.appendChild(searchResultContainerEl);
    inputEl.dispatchEvent(
      new KeyboardEvent("keypress", {
        key: "Enter",
      })
    );
    const rawSearchResult = await getResultFromSearchView(currentView);
    const files = getFilesFromSearchResult(rawSearchResult);
    console.log(files);
    onChange(inputEl.value, files);
    parentEl.appendChild(searchResultContainerEl);
    return files;
  };

  eventBus.on("trigger-search", () => {
    triggerSearch();
  });

  return [searchRowEl, triggerSearch] as const;
};
