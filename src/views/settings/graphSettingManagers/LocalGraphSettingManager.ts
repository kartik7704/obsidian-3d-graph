import type { StateChange } from "@/util/State";
import { State } from "@/util/State";
import type { LocalGraphSettings } from "@/SettingsSchemas";
import { type LocalGraph3dView } from "@/views/graph/3dView/LocalGraph3dView";
import { GraphSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";

export class LocalGraphSettingManager extends GraphSettingManager {
  protected graphView: LocalGraph3dView;
  protected currentSetting: State<LocalGraphSettings>;
  protected settingChanges: StateChange<unknown, LocalGraphSettings>[] = [];

  private constructor(parentView: LocalGraph3dView) {
    super();
    this.graphView = parentView;
    const pluginSetting = this.graphView.plugin.settingManager.getSettings();
    this.currentSetting = new State(pluginSetting.temporaryLocalGraphSetting);
  }

  static new(parentView: LocalGraph3dView) {
    const settingManager = new LocalGraphSettingManager(parentView);
    settingManager.onReady();
    return settingManager;
  }
}
