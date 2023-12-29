import { PluginSettingManager } from "@/SettingManager";
import type { StateChange } from "@/util/State";
import { State } from "@/util/State";
import type { MarkdownPostProcessorGraphSettings } from "@/SettingsSchemas";
import { GraphType } from "@/SettingsSchemas";
import type { PostProcessorGraph3dView } from "@/views/graph/3dView/PostProcessorGraph3dView";
import { GraphSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";

export class PostProcessorGraphSettingManager extends GraphSettingManager {
  protected graphView: PostProcessorGraph3dView;
  protected currentSetting: State<MarkdownPostProcessorGraphSettings>;
  protected settingChanges: StateChange<unknown, MarkdownPostProcessorGraphSettings>[] = [];

  private constructor(parentView: PostProcessorGraph3dView) {
    super();
    this.graphView = parentView;
    this.currentSetting = new State(PluginSettingManager.getNewSetting(GraphType.postProcessor));
  }

  static new(parentView: PostProcessorGraph3dView) {
    const settingManager = new PostProcessorGraphSettingManager(parentView);
    settingManager.onReady();
    return settingManager;
  }
}
