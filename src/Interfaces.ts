import { SearchView, TAbstractFile } from "obsidian";

/**
 * the config object of the search engine
 */
export type SearchConfig = {
  /**
   * the file name
   */
  file: string;
  path: string;
  extension: string;
  tag: string;
};

export interface ISettingManager<SettingType = unknown> {
  /**
   * save settings
   */
  saveSettings(): Promise<void>;

  /**
   * update the settings of the plugin. The updateFunc will be called with the current settings as the argument
   *
   * @returns the updated settings
   */
  updateSettings(updateFunc: (setting: typeof this.setting) => void): SettingType;

  /**
   * get the settings of the plugin
   */
  getSettings(): SettingType;

  /**
   * return the settings of the plugin
   */
  loadSettings(): Promise<SettingType>;
}

abstract class ISearchEngine {
  readonly useBuiltInSearchInput: boolean;
}

export abstract class IActiveSearchEngine extends ISearchEngine {
  /**
   * parse the query to config
   */
  abstract parseQueryToConfig(query: string): SearchConfig;
  /**
   * search for files
   */
  abstract searchFiles(config: SearchConfig): TAbstractFile[];
}

export abstract class IPassiveSearchEngine extends ISearchEngine {
  abstract addMutationObserver(
    searchResultContainerEl: HTMLDivElement,
    view: SearchView,
    mutationCallback: (files: TAbstractFile[]) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
  ): void;
}

export interface IFileManager {
  /**
   * get all the files in the vault
   */
  getFiles(): void;

  /**
   * get all the markdown files in the vault
   */
  getMarkdownFiles(): void;

  /**
   * get all files and folders in the vault
   */
  getAllFilesAndFolders(): void;

  /**
   * given a query, search for files
   */
  searchFiles(query: string): TAbstractFile[];
}
