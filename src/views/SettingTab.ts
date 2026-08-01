import type { App } from "obsidian";
import { Modal, PluginSettingTab, Setting } from "obsidian";
import type Graph3dPlugin from "@/main";
import {
  CommandClickNodeAction,
  FreecamCursorReleaseInput,
  SearchEngineType,
  spatialNoteRespawnDistance,
} from "@/SettingsSchemas";
import { DEFAULT_SETTING } from "@/SettingManager";

class GraphHelpModal extends Modal {
  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("graph-3d-help-modal");
    contentEl.createEl("h2", { text: "Navigating the 3D graph" });

    const section = (title: string, items: [string, string][]) => {
      contentEl.createEl("h3", { text: title });
      const list = contentEl.createEl("ul");
      for (const [term, desc] of items) {
        const item = list.createEl("li");
        item.createEl("strong", { text: `${term}: ` });
        item.appendText(desc);
      }
    };

    section("Basic controls", [
      ["Left-click drag", "rotate the camera"],
      ["Mouse wheel / middle-click drag", "zoom"],
      ["Right-click drag (or Cmd + left-click drag)", "pan"],
      ["Click a node", "open it (behavior configurable below)"],
    ]);

    section("Rings (orbital grouping)", [
      [
        "Making a ring",
        'drag a node to designate it a "ring", then set its ring-file property to the tag that should orbit it',
      ],
      ["Moving a ring", "drag the ring node itself to reposition the whole orbiting group"],
    ]);

    section("Freecam mode", [
      ["F", "toggle freecam on/off"],
      ["WASD", "move"],
      ["Mouse", "look (after the scene captures your pointer — click once to lock it)"],
      ["Q / E", "roll"],
      ["R", "level the camera"],
      ["P", "toggle the movement trail"],
      ["Shift", "move faster"],
      [
        "Releasing the cursor",
        'Escape always works; right-click is also configurable below ("Release freecam cursor")',
      ],
      [
        "Click a node in freecam",
        "opens it as a floating panel anchored in 3D space next to the node",
      ],
      [
        "Double-click a panel's header",
        "respawn it in front of the camera (distance configurable below)",
      ],
    ]);

    section("Manual positioning", [
      [
        "graph_pos frontmatter",
        "set a node's exact position by hand via its frontmatter, instead of letting physics place it",
      ],
    ]);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

const DEFAULT_NUMBER = DEFAULT_SETTING.pluginSetting.maxNodeNumber;
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
    containerEl.addClasses(["graph-3d-setting-tab"]);

    new Setting(containerEl)
      .setName("Help")
      .setDesc("Controls, freecam, rings, and manual positioning, all in one place.")
      .addButton((button) => {
        button.setButtonText("Open guide").onClick(() => {
          new GraphHelpModal(this.app).open();
        });
      });

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
                setting.value.pluginSetting.maxNodeNumber = DEFAULT_NUMBER;
              });
            } else {
              // remove the error
              text.inputEl.setCustomValidity("");
              this.plugin.settingManager.updateSettings((setting) => {
                setting.value.pluginSetting.maxNodeNumber = Number(value);
              });

              // force all the graph view to reset their settings
              this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
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
          .addOptions({
            [SearchEngineType.default]: SearchEngineType.default,
          })
          // you need to add options before set value
          .setValue(pluginSetting.searchEngine)
          .onChange(async (value: SearchEngineType) => {
            // update the json
            this.plugin.settingManager.updateSettings((setting) => {
              setting.value.pluginSetting.searchEngine = value;
            });

            // update the plugin file manager
            this.plugin.fileManager.setSearchEngine();

            // force all the graph view to reset their settings
            this.plugin.activeGraphViews.forEach((view) => view.settingManager.resetSettings());
          });
      });

    // create an H2 element called "Controls"
    containerEl.createEl("h2", { text: "Controls" });

    new Setting(containerEl)
      .setName("Right click to pan")
      .setDesc(
        "If true, right click will pan the graph. Otherwise, Cmd + left click will pan the graph."
      )
      .addToggle((toggle) => {
        toggle.setValue(pluginSetting.rightClickToPan).onChange(async (value) => {
          // update the json
          this.plugin.settingManager.updateSettings((setting) => {
            setting.value.pluginSetting.rightClickToPan = value;
          });

          // force all the graph view to reset their settings
          this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
        });
      });

    new Setting(containerEl)
      .setName("Release freecam cursor")
      .setDesc(
        "Choose the freecam input that releases pointer lock. Escape remains Electron's built-in safety release even when right-click is selected."
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            [FreecamCursorReleaseInput.escape]: "Escape",
            [FreecamCursorReleaseInput.rightClick]: "Right-click",
          })
          .setValue(pluginSetting.freecamCursorReleaseInput)
          .onChange(async (value: FreecamCursorReleaseInput) => {
            this.plugin.settingManager.updateSettings((setting) => {
              setting.value.pluginSetting.freecamCursorReleaseInput = value;
            });
            this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
          });
      });

    new Setting(containerEl)
      .setName("Panel respawn distance")
      .setDesc("Distance in graph units used when double-clicking a panel header.")
      .addText((text) => {
        const currentValue = pluginSetting.spatialNoteRespawnDistance;
        text
          .setPlaceholder(`${spatialNoteRespawnDistance.default}`)
          .setValue(currentValue === spatialNoteRespawnDistance.default ? "" : String(currentValue))
          .onChange((value) => {
            const trimmedValue = value.trim();
            const nextValue =
              trimmedValue === "" ? spatialNoteRespawnDistance.default : Number(trimmedValue);
            if (!Number.isFinite(nextValue) || nextValue < spatialNoteRespawnDistance.min) {
              text.inputEl.setCustomValidity(
                `Enter a distance of at least ${spatialNoteRespawnDistance.min}`
              );
              text.inputEl.reportValidity();
              return;
            }
            text.inputEl.setCustomValidity("");
            this.plugin.settingManager.updateSettings((setting) => {
              setting.value.pluginSetting.spatialNoteRespawnDistance = nextValue;
            });
          });
        text.inputEl.type = "number";
        text.inputEl.min = `${spatialNoteRespawnDistance.min}`;
        text.inputEl.step = "1";
      });

    new Setting(containerEl)
      .setName("Command + left click node")
      .setDesc("What to do when command + left click a node")
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            [CommandClickNodeAction.openNodeInNewTab]: "Open node in new tab",
            [CommandClickNodeAction.focusNode]: "Focus on node",
          })
          // you need to add options before set value
          .setValue(pluginSetting.commandLeftClickNode)
          .onChange(async (value: string) => {
            // update the json
            this.plugin.settingManager.updateSettings((setting) => {
              setting.value.pluginSetting.commandLeftClickNode = value as CommandClickNodeAction;
            });

            // force all the graph view to reset their settings
            this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
          });
      });

    new Setting(containerEl)
      .setName("Command + right click node")
      .setDesc("What to do when command + right click a node")
      .addDropdown((dropdown) => {
        dropdown
          .addOptions({
            [CommandClickNodeAction.openNodeInNewTab]: "Open node in new tab",
            [CommandClickNodeAction.focusNode]: "Focus on node",
          })
          // you need to add options before set value
          .setValue(pluginSetting.commandRightClickNode)
          .onChange(async (value: string) => {
            // update the json
            this.plugin.settingManager.updateSettings((setting) => {
              setting.value.pluginSetting.commandRightClickNode = value as CommandClickNodeAction;
            });

            // force all the graph view to reset their settings
            this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
          });
      });
  }
}
