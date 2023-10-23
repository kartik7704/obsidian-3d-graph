import { App, PluginSettingTab, Setting } from "obsidian";
import Graph3dPlugin from "@/main";
import { SearchEngineType } from "@/SettingsSchemas";
import { BasicSearchEngine } from "@/BasicSearchEngine";
import { DvSearchEngine } from "@/DvSearchEngine";
import { PassiveSearchEngine } from "@/PassiveSearchEngine";

const DEFAULT_NUMBER = 200;

export class SettingTab extends PluginSettingTab {
  plugin: Graph3dPlugin;

  constructor(app: App, plugin: Graph3dPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const pluginSetting = this.plugin.settingManager.getSettings().pluginSetting;
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName("Maximum node number in graph")
      .setDesc(
        "The maximum number of nodes in the graph. Graphs that has more than this number will not be rendered so that your computer is protected from hanging."
      )
      .addText((text) => {
        text
          .setPlaceholder(`${DEFAULT_NUMBER}`)
          .setValue(String(pluginSetting.maxNodeNumber ?? DEFAULT_NUMBER))
          .onChange(async (value) => {
            // check if value is a number
            if (isNaN(Number(value)) || Number(value) === 0) {
              // set the error to the input
              text.inputEl.setCustomValidity("Please enter a non-zero number");
              this.plugin.settingManager.updateSettings((setting) => {
                setting.pluginSetting.maxNodeNumber = DEFAULT_NUMBER;
                return setting;
              });
            } else {
              // remove the error
              text.inputEl.setCustomValidity("");
              this.plugin.settingManager.updateSettings((setting) => {
                setting.pluginSetting.maxNodeNumber = Number(value);
                return setting;
              });
            }
            text.inputEl.reportValidity();
          });
        text.inputEl.setAttribute("type", "number");
        text.inputEl.setAttribute("min", "10");
        return text;
      });

    new Setting(containerEl)
      .setName("Search Engine")
      .setDesc("Search engine determine how to parse the query string and return results.")
      .addDropdown((dropdown) => {
        dropdown
          .addOptions(SearchEngineType)
          // you need to add options before set value
          .setValue(pluginSetting.searchEngine)
          .onChange(async (value: SearchEngineType) => {
            // update the json
            this.plugin.settingManager.updateSettings((setting) => {
              setting.pluginSetting.searchEngine = value;
              return setting;
            });

            // update the plugin file manager
            this.plugin.fileManager.searchEngine =
              value === SearchEngineType.default
                ? new BasicSearchEngine(this.plugin)
                : value === SearchEngineType.dataview
                ? new DvSearchEngine(this.plugin)
                : new PassiveSearchEngine((files) => {
                    console.log(files);
                  });

            // force all the graph view to reset their settings
            this.plugin.activeGraphViews.forEach((view) => view.settingManager.resetSettings());
          });
      });
  }
}
