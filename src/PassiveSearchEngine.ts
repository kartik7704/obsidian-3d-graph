import { IPassiveSearchEngine } from "@/Interfaces";
import Graph3dPlugin from "@/main";
import { waitForStable } from "@/util/waitFor";
import { SearchView, TAbstractFile, TFile } from "obsidian";

export type SearchResultFile = ReturnType<typeof getFilesFromSearchResult>[0];

/**
 * given the result from `getResultFromSearchView`, return the files
 */
const getFilesFromSearchResult = (rawSearchResult: unknown) => {
  // @ts-ignore
  return Array.from(rawSearchResult.keys()) as TFile[];
};

const getResultFromSearchView = async (searchView: SearchView) => {
  await waitForStable(() => {
    return searchView.dom.resultDomLookup.size;
  }, {});
  return searchView.dom.resultDomLookup;
};

/**
 * this is the built in search engine that uses the obsidian search engine
 */
export class PassiveSearchEngine implements IPassiveSearchEngine {
  useBuiltInSearchInput = true;
  plugin: Graph3dPlugin;

  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
  }

  /**
   * given a search result container element, add a mutation observer to it
   */
  addMutationObserver(
    searchResultContainerEl: HTMLDivElement,
    view: SearchView,
    mutationCallback: (files: TAbstractFile[]) => void
  ) {
    const observer = new MutationObserver(async (mutations) => {
      // if the search result is loading or the cache is not ready, then we know that the search must not be ready yet
      if (searchResultContainerEl.classList.contains("is-loading") || !this.plugin.cacheIsReady)
        return;
      const files = getFilesFromSearchResult(await getResultFromSearchView(view));
      mutationCallback(files);
    });
    observer.observe(searchResultContainerEl, {
      childList: true,
      subtree: true,
    });
  }
}
