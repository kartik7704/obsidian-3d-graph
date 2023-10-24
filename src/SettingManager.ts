import Graph3dPlugin from "@/main";
import { ISettingManager } from "@/Interfaces";
import { copy } from "copy-anything";
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

export type BaseFilterSettings = Prettify<z.TypeOf<typeof BaseFilterSettingsSchema>>;

export type LocalFilterSetting = Prettify<z.TypeOf<typeof LocalFilterSettingSchema>>;

export type GroupSettings = Prettify<z.TypeOf<typeof GroupSettingsSchema>>;

export type BaseDisplaySettings = Prettify<z.TypeOf<typeof BaseDisplaySettingsSchema>>;

export type LocalDisplaySettings = Prettify<z.TypeOf<typeof LocalDisplaySettingsSchema>>;

export type GlobalGraphSettings = Prettify<z.TypeOf<typeof GlobalGraphSettingsSchema>>;

export type LocalGraphSettings = Prettify<z.TypeOf<typeof LocalGraphSettingsSchema>>;

export type SavedSetting = Prettify<z.TypeOf<typeof SavedSettingSchema>>;

export type Setting = Prettify<z.TypeOf<typeof SettingSchema>>;

const DEFAULT_SETTING: Setting = {
  savedSettings: [],
  pluginSetting: {
    maxNodeNumber: 200,
    searchEngine: SearchEngineType.default,
  },
};

const corruptedMessage =
  "The setting is corrupted. You will not be able to save the setting. Please backup your data.json, remove it and reload the plugin. Then migrate your old setting back.";

/**
 * @remarks the setting will not keep the temporary setting. It will only keep the saved settings.
 */
export class MySettingManager implements ISettingManager<Setting> {
  private plugin: Graph3dPlugin;
  private setting: Setting;
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
  updateSettings(updateFunc: (setting: Setting) => Setting): Setting {
    // update the setting first
    this.setting = updateFunc(copy(this.setting));
    // save the setting to json
    this.asyncQueue.push(this.saveSettings.bind(this));
    // return the updated setting
    return this.setting;
  }

  getSettings(): Setting {
    return this.setting;
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
      this.setting = DEFAULT_SETTING;
      this.isLoaded = true;
      await this.saveSettings();
      return this.setting;
    }

    const result = SettingSchema.safeParse(loadedData);
    // the data schema is wrong or the data is corrupted, then we need to initialize the data
    if (!result.success) {
      createNotice(corruptedMessage);
      console.warn("parsed loaded data failed", result.error.flatten());
      this.isLoaded = false;
      this.setting = DEFAULT_SETTING;
      return this.setting;
    }

    console.log("parsed loaded data successfully");

    this.setting = result.data;
    return this.setting;
  }

  /**
   * save the settings to the json file
   */
  async saveSettings() {
    if (!this.isLoaded) {
      // try to parse it again to see if it is corrupted
      const result = SettingSchema.safeParse(this.setting);

      if (!result.success) {
        createNotice(corruptedMessage);
        console.warn("parsed loaded data failed", result.error.flatten());
        return;
      }

      this.isLoaded = true;
      console.log("parsed loaded data successfully");
    }
    await this.plugin.saveData(this.setting);
    console.log("saved: ", this.setting);
  }

  /**
   * given a type, return the setting object
   */
  getNewSetting(
    type: GraphType
  ): typeof type extends GraphType.global ? GlobalGraphSettings : LocalGraphSettings {
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
          nodeSize: 10,
          linkThickness: 1,
          linkDistance: 100,
          nodeHoverColor: "#ff0000",
          nodeHoverNeighbourColor: "#ff0000",
          nodeRepulsion: 1000,
          linkHoverColor: "#ff0000",
          showExtension: true,
          showFullPath: true,
          showCenterCoordinates: true,
          showLinkArrow: true,
          dontMoveWhenDrag: false,
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
          nodeSize: 10,
          linkThickness: 1,
          linkDistance: 100,
          nodeHoverColor: "#ff0000",
          nodeHoverNeighbourColor: "#ff0000",
          nodeRepulsion: 1000,
          linkHoverColor: "#ff0000",
          showExtension: true,
          showFullPath: true,
          showCenterCoordinates: true,
          showLinkArrow: true,
          dontMoveWhenDrag: false,
          dagOrientation: undefined,
        },
      } as LocalGraphSettings;
    }
  }
}
