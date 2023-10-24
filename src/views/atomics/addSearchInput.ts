import { PassiveSearchEngine } from "@/PassiveSearchEngine";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { spawnLeafView } from "@/views/leafView";
import { SearchView, TAbstractFile, TextComponent } from "obsidian";

/**
 * depends on the search engine, this might be a normal text input or a built-in search input
 *
 * @remarks
 * the search input doesn't perform the search, it only display the input
 */
export const addSearchInput = async (
  containerEl: HTMLElement,
  /**
   * the current value
   */
  value: string,
  /**
   * callback for when the value is changed.
   *
   * When the input is changed, the will use the search engine to parse and look for the files
   *
   * @param value the new value
   * @param files the files that match the query
   */
  onChange: (value: string) => void,
  view: NewGraph3dView
) => {
  const searchEl = containerEl.createDiv({
    // cls :
  });
  if (!view.plugin.fileManager.searchEngine.useBuiltInSearchInput) {
    const text = new TextComponent(searchEl).setValue(value).onChange((value) => {
      onChange(value);
    });

    text.inputEl.parentElement?.addClasses([
      "search-input-container",
      "global-search-input-container",
    ]);
    return;
  }

  const [searchLeaf] = spawnLeafView(view.plugin, searchEl);

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
  inputEl.oninput = async (e: Event<HTMLInputElement>) => {
    // @ts-ignore
    onChange(e.currentTarget?.value);
  };

  clearButtonEl.onclick = () => {
    // if inputEl has is-loading, then do nothing
    // if (inputEl.classList.contains("is-loading")) return;
    onChange("");
  };

  // this make search that the search result container el is alaways visible
  view.containerEl.appendChild(searchResultContainerEl);

  // if it is a passive engine, we need to enable mutation observer

  const addMutationObserver = (callback: (files: TAbstractFile[]) => void) => {
    if (view.plugin.fileManager.searchEngine instanceof PassiveSearchEngine)
      view.plugin.fileManager.searchEngine.addMutationObserver(
        searchResultContainerEl,
        searchLeaf.view as SearchView,
        callback
      );
    else {
      throw new Error("cannot add mutation observer to active search engine");
    }
  };

  return { searchRowEl, addMutationObserver };
};
