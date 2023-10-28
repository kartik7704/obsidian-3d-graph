import { BasicSearchEngine } from "@/BasicSearchEngine";
import { DvSearchEngine } from "@/DvSearchEngine";
import { IFileManager, IPassiveSearchEngine, IActiveSearchEngine } from "@/Interfaces";
import { DefaultSearchEngine as DefaultSearchEngine } from "@/PassiveSearchEngine";
import { SearchEngineType } from "@/SettingsSchemas";
import Graph3dPlugin from "@/main";

/**
 * this class will handle the active searching of a graph view.
 */
export class MyFileManager implements IFileManager {
  private plugin: Graph3dPlugin;
  public searchEngine: IActiveSearchEngine | IPassiveSearchEngine;

  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
    this.setSearchEngine();
  }

  /**
   * this will set the search engine base on the setting
   */
  setSearchEngine() {
    const searchEngine = this.plugin.settingManager.getSettings().pluginSetting.searchEngine;
    if (searchEngine === SearchEngineType.default)
      this.searchEngine = new DefaultSearchEngine(this.plugin);
    else if (searchEngine === SearchEngineType.dataview)
      this.searchEngine = new DvSearchEngine(this.plugin);
    else this.searchEngine = new BasicSearchEngine(this.plugin);
  }

  getFiles() {
    return this.plugin.app.vault.getFiles();
  }
  getMarkdownFiles() {
    return this.plugin.app.vault.getMarkdownFiles();
  }
  getAllFilesAndFolders() {
    return this.plugin.app.vault.getAllLoadedFiles();
  }
  searchFiles(query: string) {
    // check whether it is active search engine
    if (this.searchEngine instanceof IActiveSearchEngine) {
      return this.searchEngine.searchFiles(this.searchEngine.parseQueryToConfig(query));
    }
    throw new Error("passive search engine cannot search files");
  }
}
