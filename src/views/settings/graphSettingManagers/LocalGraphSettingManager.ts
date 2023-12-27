import { State, StateChange } from "@/util/State";
import { LocalGraphSettings } from "@/SettingsSchemas";
import { type LocalGraph3dView } from "@/views/graph/3dView/LocalGraph3dView";
import { GSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";

export class LocalGraphSettingManager extends GSettingManager {
  protected graphView: LocalGraph3dView;
  protected currentSetting: State<LocalGraphSettings>;
  protected settingChanges: StateChange<unknown, LocalGraphSettings>[] = [];

  constructor(parentView: LocalGraph3dView) {
    super();
    this.graphView = parentView;
    const pluginSetting = this.graphView.plugin.settingManager.getSettings();
    this.currentSetting = new State(pluginSetting.temporaryLocalGraphSetting);
  }
}
