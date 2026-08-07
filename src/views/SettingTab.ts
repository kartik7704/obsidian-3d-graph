import type { App, SettingDefinitionItem } from "obsidian";
import { Modal, PluginSettingTab } from "obsidian";
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

  /**
   * Routes every declarative control's persisted value through the same
   * reactive settingManager the rest of the plugin uses, instead of the
   * `this.plugin.settings` object the base class defaults assume.
   */
  getControlValue(key: string): unknown {
    const pluginSetting = this.plugin.settingManager.getSettings().pluginSetting;
    return (pluginSetting as unknown as Record<string, unknown>)[key];
  }

  setControlValue(key: string, value: unknown): void {
    this.plugin.settingManager.updateSettings((setting) => {
      (setting.value.pluginSetting as unknown as Record<string, unknown>)[key] = value;
    });

    switch (key) {
      case "searchEngine":
        this.plugin.fileManager.setSearchEngine();
        this.plugin.activeGraphViews.forEach((view) => view.settingManager.resetSettings());
        break;
      case "rightClickToPan":
      case "freecamCursorReleaseInput":
      case "commandLeftClickNode":
      case "commandRightClickNode":
        this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
        break;
    }
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        name: "Help",
        desc: "Controls, freecam, rings, and manual positioning, all in one place.",
        render: (setting) => {
          setting.addButton((button) => {
            button.setButtonText("Open guide").onClick(() => {
              new GraphHelpModal(this.app).open();
            });
          });
        },
      },
      {
        name: "Maximum node number in graph",
        desc: "The maximum number of nodes in the graph. Graphs that has more than this number will not be rendered so that your computer is protected from hanging.",
        // custom render (not a declarative `number` control): invalid input
        // silently resets and persists the default rather than just
        // rejecting the change, which the framework's `validate` can't do.
        render: (setting) => {
          const pluginSetting = this.plugin.settingManager.getSettings().pluginSetting;
          setting.addText((text) => {
            text
              .setPlaceholder(`${DEFAULT_NUMBER}`)
              .setValue(String(pluginSetting.maxNodeNumber ?? DEFAULT_NUMBER))
              .onChange(async (value) => {
                if (isNaN(Number(value)) || Number(value) === 0) {
                  text.inputEl.setCustomValidity("Please enter a non-zero number");
                  this.plugin.settingManager.updateSettings((draft) => {
                    draft.value.pluginSetting.maxNodeNumber = DEFAULT_NUMBER;
                  });
                } else {
                  text.inputEl.setCustomValidity("");
                  this.plugin.settingManager.updateSettings((draft) => {
                    draft.value.pluginSetting.maxNodeNumber = Number(value);
                  });
                  this.plugin.activeGraphViews.forEach((view) => view.refreshGraph());
                }
                text.inputEl.reportValidity();
              });
            text.inputEl.setAttribute("type", "number");
            text.inputEl.setAttribute("min", "10");
            return text;
          });
        },
      },
      {
        name: "Search Engine",
        desc: "Search engine determine how to parse the query string and return results.",
        control: {
          type: "dropdown",
          key: "searchEngine",
          options: {
            [SearchEngineType.default]: SearchEngineType.default,
          },
        },
      },
      {
        type: "group",
        heading: "Controls",
        items: [
          {
            name: "Right click to pan",
            desc: "If true, right click will pan the graph. Otherwise, Cmd + left click will pan the graph.",
            control: { type: "toggle", key: "rightClickToPan" },
          },
          {
            name: "Release freecam cursor",
            desc: "Choose the freecam input that releases pointer lock. Escape remains Electron's built-in safety release even when right-click is selected.",
            control: {
              type: "dropdown",
              key: "freecamCursorReleaseInput",
              options: {
                [FreecamCursorReleaseInput.escape]: "Escape",
                [FreecamCursorReleaseInput.rightClick]: "Right-click",
              },
            },
          },
          {
            name: "Panel respawn distance",
            desc: "Distance in graph units used when double-clicking a panel header.",
            // custom render: empty input means "reset to default" (shown via
            // placeholder), which a declarative `number` control's plain
            // key-binding can't express.
            render: (setting) => {
              const pluginSetting = this.plugin.settingManager.getSettings().pluginSetting;
              setting.addText((text) => {
                const currentValue = pluginSetting.spatialNoteRespawnDistance;
                text
                  .setPlaceholder(`${spatialNoteRespawnDistance.default}`)
                  .setValue(
                    currentValue === spatialNoteRespawnDistance.default ? "" : String(currentValue)
                  )
                  .onChange((value) => {
                    const trimmedValue = value.trim();
                    const nextValue =
                      trimmedValue === ""
                        ? spatialNoteRespawnDistance.default
                        : Number(trimmedValue);
                    if (!Number.isFinite(nextValue) || nextValue < spatialNoteRespawnDistance.min) {
                      text.inputEl.setCustomValidity(
                        `Enter a distance of at least ${spatialNoteRespawnDistance.min}`
                      );
                      text.inputEl.reportValidity();
                      return;
                    }
                    text.inputEl.setCustomValidity("");
                    this.plugin.settingManager.updateSettings((draft) => {
                      draft.value.pluginSetting.spatialNoteRespawnDistance = nextValue;
                    });
                  });
                text.inputEl.type = "number";
                text.inputEl.min = `${spatialNoteRespawnDistance.min}`;
                text.inputEl.step = "1";
              });
            },
          },
          {
            name: "Command + left click node",
            desc: "What to do when command + left click a node",
            control: {
              type: "dropdown",
              key: "commandLeftClickNode",
              options: {
                [CommandClickNodeAction.openNodeInNewTab]: "Open node in new tab",
                [CommandClickNodeAction.focusNode]: "Focus on node",
              },
            },
          },
          {
            name: "Command + right click node",
            desc: "What to do when command + right click a node",
            control: {
              type: "dropdown",
              key: "commandRightClickNode",
              options: {
                [CommandClickNodeAction.openNodeInNewTab]: "Open node in new tab",
                [CommandClickNodeAction.focusNode]: "Focus on node",
              },
            },
          },
        ],
      },
    ];
  }
}
