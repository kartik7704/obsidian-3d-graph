import { IActiveSearchEngine, SearchConfig } from "@/Interfaces";
import Graph3dPlugin from "@/main";
import { TAbstractFile } from "obsidian";

export class BasicSearchEngine implements IActiveSearchEngine {
  public readonly useBuiltInSearchInput: boolean = true;
  private plugin: Graph3dPlugin;

  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
  }

  parseQueryToConfig(query: string): SearchConfig {
    throw new Error("Method not implemented.");
  }

  searchFiles(config: SearchConfig): TAbstractFile[] {
    // base on the json, filter the files
    throw new Error("Method not implemented.");
  }
}
