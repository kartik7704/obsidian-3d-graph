import { IPassiveSearchEngine } from "@/Interfaces";
import { TAbstractFile } from "obsidian";

/**
 * this is the built in search engine that uses the obsidian search engine
 */
export class PassiveSearchEngine implements IPassiveSearchEngine {
  useBuiltInSearchInput = true;
  mutationCallback: (files: TAbstractFile[]) => void;

  constructor(mutationCallback: (files: TAbstractFile[]) => void) {
    this.mutationCallback = mutationCallback;

    // init the listeners for the changes
  }

  getFiles(): TAbstractFile[] {
    throw new Error("Method not implemented.");
  }
}
