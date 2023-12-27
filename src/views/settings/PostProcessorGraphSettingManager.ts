import { PluginSettingManager } from "@/SettingManager";
import { State, StateChange } from "@/util/State";
import { GraphType, MarkdownPostProcessorGraphSettings } from "@/SettingsSchemas";
import { PostProcessorGraph3dView } from "@/views/graph/3dView/PostProcessorGraph3dView";
import { GSettingManager } from "@/views/settings/GraphSettingsManager";

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
