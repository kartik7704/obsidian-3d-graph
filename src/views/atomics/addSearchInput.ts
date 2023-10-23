import Graph3dPlugin from "@/main";
import { spawnLeafView } from "@/views/leafView";
import { TextComponent } from "obsidian";

/**
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
  plugin: Graph3dPlugin
) => {
  const searchEl = containerEl.createDiv({
    // cls :
  });
  if (!plugin.fileManager.searchEngine.useBuiltInSearchInput) {
    const text = new TextComponent(searchEl).setValue(value).onChange((value) => {
      onChange(value);
    });

    text.inputEl.parentElement?.addClasses([
      "search-input-container",
      "global-search-input-container",
    ]);
    return;
  }

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
  // const parentEl = searchResultContainerEl.parentElement!;
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
  inputEl.onkeydown = async (e) => {
    // const query = inputEl.value;
    // const files = plugin.fileManager.searchFiles(query);
    onChange(inputEl.value);
  };

  clearButtonEl.onclick = () => {
    // if inputEl has is-loading, then do nothing
    // if (inputEl.classList.contains("is-loading")) return;
    onChange("");
  };

  return [searchRowEl] as const;
};
