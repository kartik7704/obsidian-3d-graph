import Graph3dPlugin from "@/main";
import { eventBus } from "@/util/EventBus";
import { waitFor, waitForStable } from "@/util/waitFor";
import { spawnLeafView } from "@/views/leafView";
import { SearchView, TFile } from "obsidian";
import { pick } from "radash";

const DomLookUpTime = 150;

export type SearchResultFile = ReturnType<typeof getFilesFromSearchResult>[0];

const getFilesFromSearchResult = (rawSearchResult: unknown) => {
  // @ts-ignore
  return (Array.from(rawSearchResult.keys()) as TFile[]).map((f) => {
    return {
      ...pick(f, ["basename", "extension", "name", "path", "stat"]),
    };
  });
};

const getResultFromSearchView = (searchView: SearchView) => {
  return waitForStable(() => {
    return searchView.dom.resultDomLookup;
  }, {});
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
    // wait for isloading to be added
    await waitFor(
      () => {
        return searchResultContainerEl.classList.contains("is-loading");
      },
      {
        // 5000 ms is the max time for "is-loading" to be added
        timeout: 1000,
        interval: DomLookUpTime,
      }
    );

    // wait for isloading to be removed

    await waitFor(
      () => {
        return !searchResultContainerEl.classList.contains("is-loading");
      },
      {
        timeout: 60000,
        interval: DomLookUpTime,
      }
    );
    const rawSearchResult = await getResultFromSearchView(currentView);
    // @ts-ignore
    const files = getFilesFromSearchResult(rawSearchResult);
    onChange(inputEl.value, files);
  };

  clearButtonEl.onclick = () => {
    // if inputEl has is-loading, then do nothing
    if (inputEl.classList.contains("is-loading")) return;
    onChange("", []);
  };

  const triggerSearch = async () => {
    plugin.activeGraphView.containerEl.appendChild(searchResultContainerEl);

    // if the input is empty, return empty array
    if (inputEl.value === "") return [];

    console.log("initiating search...");

    inputEl.dispatchEvent(
      new KeyboardEvent("keypress", {
        key: "Enter",
      })
    );

    // when it is initializing, just disable the input
    inputEl.disabled = true;

    // this should trigger the search and append loading state
    // wait for the search result to be loaded
    await waitFor(
      () => {
        return searchResultContainerEl.classList.contains("is-loading");
      },
      {
        // 5000 ms is the max time for "is-loading" to be added
        timeout: 5000,
        interval: DomLookUpTime,
      }
    );

    await waitFor(
      () => {
        return !searchResultContainerEl.classList.contains("is-loading");
      },
      {
        timeout: 60000,
        interval: DomLookUpTime,
      }
    );

    console.log("search bar done loading...");
    inputEl.disabled = false;

    const rawSearchResult = await getResultFromSearchView(currentView);
    const files = getFilesFromSearchResult(rawSearchResult);
    onChange(inputEl.value, files);
    parentEl.appendChild(searchResultContainerEl);
    return files;
  };

  eventBus.on("trigger-search", triggerSearch);

  return [searchRowEl, triggerSearch] as const;
};
