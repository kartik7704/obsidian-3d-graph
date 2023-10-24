import { TAbstractFile } from "obsidian";
import { BaseFilterSettings, LocalFilterSetting } from "@/SettingManager";
import { GraphType } from "@/SettingsSchemas";
import { Graph } from "@/graph/Graph";
import Graph3dPlugin from "@/main";

/**
 * the files from the search result or the files from the search engine cannot be used directly
 */
export const getGraphAfterProcessingConfig = (
  plugin: Graph3dPlugin,
  {
    files,
    graphType,
    setting,
    centerFile,
  }: {
    files: TAbstractFile[];
    graphType: GraphType;
    setting: BaseFilterSettings | LocalFilterSetting;
    centerFile?: TAbstractFile;
  }
) => {
  if (graphType === GraphType.local && "depth" in setting) {
    // then it is a local graph
    return Graph.createFromMask(
      (node) => {
        // if node is an orphan and show orphan is false, then we will not show it
        if (node.links.length === 0 && !setting.showOrphans) return false;
        // if node is not a markdown  and show attachment is false, then we will not show it
        if (!node.path.endsWith(".md") && !setting.showAttachments) return false;
        // if the node is not in the files, then we will not show it
        return files.length === 0 ? true : files.some((file) => file.path === node.path);
      },
      // active file must exist in local graph
      plugin.globalGraph.getLocalGraph({
        path: centerFile?.path ?? "",
        depth: setting.depth,
        linkType: setting.linkType,
      })
    );
  } else {
    // if it is global graph
    return Graph.createFromMask((node) => {
      // if node is an orphan and show orphan is false, then we will not show it
      if (node.links.length === 0 && !setting.showOrphans) return false;
      // if node is not a markdown  and show attachment is false, then we will not show it
      if (!node.path.endsWith(".md") && !setting.showAttachments) return false;
      // if the node is not in the files, then we will not show it
      return files.length === 0 ? true : files.some((file) => file.path === node.path);
    }, plugin.globalGraph);
  }
};
