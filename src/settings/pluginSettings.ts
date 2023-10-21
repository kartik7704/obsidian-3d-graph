import { App, PluginSettingTab, Setting } from "obsidian";
import Graph3dPlugin from "@/main";

const DEFAULT_NUMBER = 200;

export class SettingTab extends PluginSettingTab {
  plugin: Graph3dPlugin;

  constructor(app: App, plugin: Graph3dPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  async display(): Promise<void> {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("Maximum node number in graph").addText((text) => {
      text
        .setPlaceholder(`${DEFAULT_NUMBER}`)
        .setValue(String(this.plugin.settingsState.value.other.maxNodeNumber ?? DEFAULT_NUMBER))
        .onChange(async (value) => {
          // check if value is a number
          if (isNaN(Number(value)) || Number(value) === 0) {
            // set the error to the input
            text.inputEl.setCustomValidity("Please enter a non-zero number");
            this.plugin.settingsState.value.other.maxNodeNumber = DEFAULT_NUMBER;
          } else {
            // remove the error
            text.inputEl.setCustomValidity("");
            this.plugin.settingsState.value.other.maxNodeNumber = Number(value);
          }
          text.inputEl.reportValidity();
          await this.plugin.saveSettings();
        });
      text.inputEl.setAttribute("type", "number");
      text.inputEl.setAttribute("min", "10");
      return text;
    });

    new Setting(containerEl).setName("Use dataview as search input").addToggle((toggle) => {
      toggle.setValue(this.plugin.settingsState.value.other.useDataView).onChange(async (value) => {
        this.plugin.settingsState.value.other.useDataView = value;
        await this.plugin.saveSettings();
      });
    });
  }
}
