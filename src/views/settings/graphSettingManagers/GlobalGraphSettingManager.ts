import type { StateChange } from "@/util/State";
import { State } from "@/util/State";
import type { GlobalGraphSettings } from "@/SettingsSchemas";
import type { GlobalGraph3dView } from "@/views/graph/3dView/GlobalGraph3dView";
import { GraphSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";

export class GlobalGraphSettingManager extends GraphSettingManager {
  protected graphView: GlobalGraph3dView;
  protected currentSetting: State<GlobalGraphSettings>;
  protected settingChanges: StateChange<unknown, GlobalGraphSettings>[] = [];

  private constructor(parentView: GlobalGraph3dView) {
    super();
    this.graphView = parentView;
    this.currentSetting = new State(
      this.graphView.plugin.settingManager.getSettings().temporaryGlobalGraphSetting
    );
  }

  static new(parentView: GlobalGraph3dView) {
    const settingManager = new GlobalGraphSettingManager(parentView);
    settingManager.onReady();
    return settingManager;
  }
}
