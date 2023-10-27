import Graph3dPlugin from "@/main";
import { ISettingManager } from "@/Interfaces";
import { AsyncQueue } from "@/util/AsyncQueue";
import { z } from "zod";
import {
  BaseFilterSettingsSchema,
  LocalFilterSettingSchema,
  GroupSettingsSchema,
  BaseDisplaySettingsSchema,
  LocalDisplaySettingsSchema,
  GlobalGraphSettingsSchema,
  LocalGraphSettingsSchema,
  SettingSchema,
  GraphType,
  SearchEngineType,
  SavedSettingSchema,
} from "@/SettingsSchemas";
import { createNotice } from "@/util/createNotice";
import { State } from "@/util/State";

const DEFAULT_NODE_SIZE = 3;
const DEFAULT_LINK_THICKNESS = 2;
const DEFAULT_LINK_DISTANCE = 100;
const DEFAULT_NODE_REPULSION = 2800;

export const nodeSize = {
  min: 1,
  max: 10,
  step: 0.1,
  default: DEFAULT_NODE_SIZE, // 3
};

export const linkThickness = {
  min: 1,
  max: 3,
  step: 0.1,
  default: DEFAULT_LINK_THICKNESS, // 3
};

export const linkDistance = {
  min: 10,
  max: 200,
  step: 1,
  default: DEFAULT_LINK_DISTANCE, // 50
};

export const nodeRepulsion = {
  min: 2500,
  max: 3000,
  step: 100,
  default: DEFAULT_NODE_REPULSION, // 28
};

export type BaseFilterSettings = Prettify<z.TypeOf<typeof BaseFilterSettingsSchema>>;

export type LocalFilterSetting = Prettify<z.TypeOf<typeof LocalFilterSettingSchema>>;

export type GroupSettings = Prettify<z.TypeOf<typeof GroupSettingsSchema>>;

export type BaseDisplaySettings = Prettify<z.TypeOf<typeof BaseDisplaySettingsSchema>>;

export type LocalDisplaySettings = Prettify<z.TypeOf<typeof LocalDisplaySettingsSchema>>;

export type GlobalGraphSettings = Prettify<z.TypeOf<typeof GlobalGraphSettingsSchema>>;

export type LocalGraphSettings = Prettify<z.TypeOf<typeof LocalGraphSettingsSchema>>;

export type SavedSetting = Prettify<z.TypeOf<typeof SavedSettingSchema>>;

export type Setting = Prettify<z.TypeOf<typeof SettingSchema>>;

export type GraphSetting = Exclude<SavedSetting["setting"], undefined>;

const corruptedMessage =
  "The setting is corrupted. You will not be able to save the setting. Please backup your data.json, remove it and reload the plugin. Then migrate your old setting back.";

/**
 * @remarks the setting will not keep the temporary setting. It will only keep the saved settings.
 */
export class MySettingManager implements ISettingManager<Setting> {
  private plugin: Graph3dPlugin;
  private setting: State<Setting> = new State(DEFAULT_SETTING);
  private asyncQueue = new AsyncQueue();

  /**
   * whether the setting is loaded successfully
   */
  private isLoaded = false;

  /**
   * @remarks don't forget to call `loadSettings` after creating this class
   */
  constructor(plugin: Graph3dPlugin) {
    this.plugin = plugin;
  }

  /**
   * this function will update the setting and save it to the json file. But it is still a sync function.
   * You should always use this function to update setting
   */
  updateSettings(updateFunc: (setting: typeof this.setting) => void): Setting {
    // update the setting first
    updateFunc(this.setting);
    // save the setting to json
    this.asyncQueue.push(this.saveSettings.bind(this));
    // return the updated setting
    return this.setting.value;
  }

  getSettings(): Setting {
    return this.setting.value;
  }

  /**
   * load the settings from the json file
   */
  async loadSettings() {
    // load the data, this can be null if the plugin is used for the first time
    const loadedData = (await this.plugin.loadData()) as unknown | null;

    console.log("loaded: ", loadedData);

    // if the data is null, then we need to initialize the data
    if (!loadedData) {
      this.setting.value = DEFAULT_SETTING;
      this.isLoaded = true;
      await this.saveSettings();
      return this.setting.value;
    }

    const result = SettingSchema.safeParse(loadedData);
    // the data schema is wrong or the data is corrupted, then we need to initialize the data
    if (!result.success) {
      createNotice(corruptedMessage);
      console.warn("parsed loaded data failed", result.error.flatten());
      this.isLoaded = false;
      this.setting.value = DEFAULT_SETTING;
      return this.setting.value;
    }

    console.log("parsed loaded data successfully");

    this.setting.value = result.data;
    return this.setting.value;
  }

  /**
   * save the settings to the json file
   */
  async saveSettings() {
    if (!this.isLoaded) {
      // try to parse it again to see if it is corrupted
      const result = SettingSchema.safeParse(this.setting.value);

      if (!result.success) {
        createNotice(corruptedMessage);
        console.warn("parsed loaded data failed", result.error.flatten());
        return;
      }

      this.isLoaded = true;
      console.log("parsed loaded data successfully");
    }
    await this.plugin.saveData(this.setting.value);
    console.log("saved: ", this.setting.value);
  }

  static getNewSetting<T extends GraphType>(
    type: T
  ): T extends GraphType.global ? GlobalGraphSettings : LocalGraphSettings {
    if (type === GraphType.global) {
      // @ts-ignore
      return {
        filter: {
          searchQuery: "",
          showOrphans: true,
          showAttachments: false,
        },
        groups: [],
        display: {
          nodeSize: nodeSize.default,
          linkThickness: linkThickness.default,
          linkDistance: linkDistance.default,
          nodeRepulsion: nodeRepulsion.default,
          // node hover color is red
          nodeHoverColor: "#ff0000",
          // node hover neighbour color is green
          nodeHoverNeighbourColor: "#00ff00",
          // link hover color is blue
          linkHoverColor: "#0000ff",
          showExtension: false,
          showFullPath: false,
          showCenterCoordinates: true,
          showLinkArrow: true,
          dontMoveWhenDrag: false,
          dagOrientation: undefined,
        },
      } as GlobalGraphSettings;
    } else {
      return {
        filter: {
          searchQuery: "",
          showOrphans: true,
          showAttachments: false,
          depth: 1,
          linkType: "both",
        },
        groups: [],
        display: {
          nodeSize: nodeSize.default,
          linkThickness: linkThickness.default,
          linkDistance: linkDistance.default,
          nodeRepulsion: nodeRepulsion.default,
          // node hover color is red
          nodeHoverColor: "#ff0000",
          // node hover neighbour color is green
          nodeHoverNeighbourColor: "#00ff00",
          // link hover color is blue
          linkHoverColor: "#0000ff",
          showExtension: false,
          showFullPath: false,
          showCenterCoordinates: true,
          showLinkArrow: true,
          dontMoveWhenDrag: false,
          dagOrientation: undefined,
        },
      } as LocalGraphSettings;
    }
  }
}

const DEFAULT_SETTING: Setting = {
  savedSettings: [],
  temporaryLocalGraphSetting: MySettingManager.getNewSetting(GraphType.local),
  temporaryGlobalGraphSetting: MySettingManager.getNewSetting(GraphType.global),
  pluginSetting: {
    maxNodeNumber: 200,
    searchEngine: SearchEngineType.default,
  },
};
