import { PluginSettingManager } from "@/SettingManager";
import type { StateChange } from "@/util/State";
import { State } from "@/util/State";
import type { MarkdownPostProcessorGraphSettings } from "@/SettingsSchemas";
import { GraphType } from "@/SettingsSchemas";
import type { PostProcessorGraph3dView } from "@/views/graph/3dView/PostProcessorGraph3dView";
import { GSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";

export class PostProcessorGraphSettingManager extends GSettingManager {
  protected graphView: PostProcessorGraph3dView;
  protected currentSetting: State<MarkdownPostProcessorGraphSettings>;
  protected settingChanges: StateChange<unknown, MarkdownPostProcessorGraphSettings>[] = [];

  constructor(parentView: PostProcessorGraph3dView) {
    super();
    this.graphView = parentView;
    this.currentSetting = new State(PluginSettingManager.getNewSetting(GraphType.postProcessor));
  }
}
