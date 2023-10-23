import { TAbstractFile } from "obsidian";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";

/**
 * this class will handle the searching of a graph view.
 *
 * @remarks the difference between this and the file manager is that
 * this class will store multiple search queries but file manager is
 * only response for searching.
 */
export class SearchManager {
  view: NewGraph3dView;
  public searchState: {
    filter: {
      query: string;
      files: TAbstractFile[];
    };
    group: {
      query: string;
      files: TAbstractFile[];
    }[];
  } = { filter: { query: "", files: [] }, group: [] };

  constructor(view: NewGraph3dView) {
    this.view = view;
  }
}
