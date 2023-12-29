import { PluginSettingManager } from "@/SettingManager";
import { State } from "@/util/State";
import type { MarkdownPostProcessorGraphSettings } from "@/SettingsSchemas";
import { GraphType } from "@/SettingsSchemas";
import type { PostProcessorGraph3dView } from "@/views/graph/3dView/PostProcessorGraph3dView";
import { GraphSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";

export class PostProcessorGraphSettingManager extends GraphSettingManager<
  MarkdownPostProcessorGraphSettings,
  PostProcessorGraph3dView
> {
  protected currentSetting: State<MarkdownPostProcessorGraphSettings>;

  private constructor(parentView: PostProcessorGraph3dView) {
    super(parentView);
    this.currentSetting = new State(PluginSettingManager.getNewSetting(GraphType.postProcessor));
  }

  // we need to override this because the underlying update method will update plugin setting
  // instead of updating the plugin setting, we need to update the value in side the codeblock
  updateCurrentSettings(
    updateFunc: (setting: State<MarkdownPostProcessorGraphSettings>) => void,
    shouldUpdateGraphView?: boolean
  ): MarkdownPostProcessorGraphSettings {
    return this.currentSetting.value;
  }

  static new(parentView: PostProcessorGraph3dView) {
    const settingManager = new PostProcessorGraphSettingManager(parentView);
    settingManager.onReady();
    return settingManager;
  }
}
