import { IFileManager, IPassiveSearchEngine, IActiveSearchEngine } from "@/Interfaces";
import Graph3dPlugin from "@/main";

/**
 * this class will handle the active searching of a graph view.
 */
export class MyFileManager implements IFileManager {
  private plugin: Graph3dPlugin;
  public searchEngine: IActiveSearchEngine | IPassiveSearchEngine;

  constructor(plugin: Graph3dPlugin, searchEngine: IActiveSearchEngine | IPassiveSearchEngine) {
    this.plugin = plugin;
    this.searchEngine = searchEngine;
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
    } else {
      return this.searchEngine.getFiles();
    }
  }
}
