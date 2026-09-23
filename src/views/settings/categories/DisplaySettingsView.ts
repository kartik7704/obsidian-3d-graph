import { addSimpleSliderSetting } from "@/views/atomics/addSimpleSliderSetting";
import { addColorPickerSetting } from "@/views/atomics/addColorPickerSetting";
import { addToggle } from "@/views/atomics/addToggle";
import { DropdownComponent, Notice, Setting } from "obsidian";
import type {
  GlobalGraphSettings,
  LocalDisplaySettings,
  LocalGraphSettings,
} from "@/SettingsSchemas";
import {
  centerCoordinatesLength,
  DagOrientation,
  distanceFromFocal,
  freecamTrailDuration,
  linkDistance,
  linkOpacity,
  linkThickness,
  nodeRepulsion,
  nodeSize,
  ringTubeRadius,
} from "@/SettingsSchemas";
import type { BaseGraphSettingManager } from "@/views/settings/graphSettingManagers/GraphSettingsManager";
import type { State } from "@/util/State";
import { createNotice } from "@/util/createNotice";

export const DisplaySettingsView = (
  graphSetting: GlobalGraphSettings | LocalGraphSettings,
  containerEl: HTMLElement,
  settingManager: BaseGraphSettingManager
) => {
  const displaySettings = graphSetting.display;
  // add the node size setting
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Node size",
      value: displaySettings.nodeSize,
      stepOptions: nodeSize,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.nodeSize = value;
      });
    }
  );

  // add link thinkness setting
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Link thickness",
      value: displaySettings.linkThickness,
      stepOptions: linkThickness,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkThickness = value;
      });
    }
  );

  // add link opacity setting (lines and arrowheads)
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Link opacity",
      value: displaySettings.linkOpacity,
      stepOptions: linkOpacity,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkOpacity = value;
      });
    }
  );

  // add link distance settings
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Link distance",
      value: displaySettings.linkDistance,
      stepOptions: linkDistance,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkDistance = value;
      });
    }
  );

  addSimpleSliderSetting(
    containerEl,
    {
      name: "Node repulsion",
      value: displaySettings.nodeRepulsion,
      stepOptions: nodeRepulsion,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.nodeRepulsion = value;
      });
    }
  );

  addSimpleSliderSetting(
    containerEl,
    {
      name: "Distance from focal",
      value: displaySettings.distanceFromFocal,
      stepOptions: distanceFromFocal,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.distanceFromFocal = value;
      });
    }
  );

  addSimpleSliderSetting(
    containerEl,
    {
      name: "Freecam trail fade (seconds)",
      value: displaySettings.freecamTrailDuration,
      stepOptions: freecamTrailDuration,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.freecamTrailDuration = value;
      });
    }
  );

  addSimpleSliderSetting(
    containerEl,
    {
      name: "Ring radius",
      value: displaySettings.ringTubeRadius,
      stepOptions: ringTubeRadius,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.ringTubeRadius = value;
      });
    }
  );

  // ref object so "Show center coordinates" (created further down, alongside
  // the other toggles) can reach this slider without needing a reassignable
  // `let` binding. Slider lives here, next to Ring radius, rather than right
  // under its own toggle - purely a layout preference.
  const centerCoordinatesLengthSettingRef: { current?: Setting } = {};

  centerCoordinatesLengthSettingRef.current = addSimpleSliderSetting(
    containerEl,
    {
      name: "Center coordinates scale",
      value: displaySettings.centerCoordinatesLength,
      stepOptions: centerCoordinatesLength,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.centerCoordinatesLength = value;
      });
    }
  );
  // only meaningful while the axes are actually visible — keeps this from
  // just being one more slider cluttering the section regardless of context
  if (!displaySettings.showCenterCoordinates)
    centerCoordinatesLengthSettingRef.current.settingEl.hide();

  addColorPickerSetting(
    containerEl,
    {
      name: "Node hover color",
      value: displaySettings.nodeHoverColor,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.nodeHoverColor = value;
      });
    }
  );

  // add node hover color setting
  addColorPickerSetting(
    containerEl,
    {
      name: "Node hover neighbour color",
      value: displaySettings.nodeHoverNeighbourColor,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.nodeHoverNeighbourColor = value;
      });
    }
  );

  // add link hover color setting
  addColorPickerSetting(
    containerEl,
    {
      name: "Link hover color",
      value: displaySettings.linkHoverColor,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkHoverColor = value;
      });
    }
  );

  // add link color setting (unset = follow the Obsidian theme's graph line color)
  addColorPickerSetting(
    containerEl,
    {
      name: "Link color",
      value: displaySettings.linkColor || "#ffffff",
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkColor = value;
      });
    }
  );

  // add show extension setting
  addToggle(
    containerEl,
    {
      name: "Show file extension",
      value: displaySettings.showExtension,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.showExtension = value;
      });
    }
  );

  // add show full path setting
  addToggle(
    containerEl,
    {
      name: "Show note full path",
      value: displaySettings.showFullPath,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.showFullPath = value;
      });
    }
  );

  addToggle(
    containerEl,
    {
      name: "Show center coordinates",
      value: displaySettings.showCenterCoordinates,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.showCenterCoordinates = value;
      });
      if (value) centerCoordinatesLengthSettingRef.current?.settingEl.show();
      else centerCoordinatesLengthSettingRef.current?.settingEl.hide();
    }
  );

  addToggle(
    containerEl,
    {
      name: "Show link arrow",
      value: displaySettings.showLinkArrow,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.showLinkArrow = value;
      });
    }
  );

  addToggle(
    containerEl,
    {
      name: "Panel supersedes node links",
      value: displaySettings.panelSupersedesNodeLinks,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.panelSupersedesNodeLinks = value;
      });
    }
  );

  addToggle(
    containerEl,
    {
      name: "Don't move when drag",
      value: displaySettings.dontMoveWhenDrag,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.dontMoveWhenDrag = value;
      });
    }
  );

  addToggle(
    containerEl,
    {
      name: "Save coordinates to frontmatter",
      value: displaySettings.saveCoordinatesToFrontmatter,
    },
    async (value) => {
      if (value && !settingManager.getCurrentSetting().display.dontMoveWhenDrag) {
        new Notice(
          "Enable 'Don't move when drag' first. Nodes need to be stable before writing to frontmatter."
        );
        settingManager.updateCurrentSettings((setting) => {
          setting.value.display.saveCoordinatesToFrontmatter = false;
        });
        return;
      }
      if (value) {
        // Bulk-write every currently visible node (respects whatever filters are
        // active right now) on every off-to-on flip, not just the first ever -
        // toggling off then back on after changing filters re-scans and writes
        // whatever's visible at that moment. Ongoing per-drag writes (onNodeDragEnd)
        // are unaffected by this and keep working exactly as before.
        const nodes = (settingManager.getGraphView().getForceGraph()?.instance.graphData().nodes ??
          []) as unknown as { path: string; x: number; y: number; z: number }[];
        const posManager = settingManager.getGraphView().plugin.nodePositionManager;
        const saved = await posManager.writeFrontmatterForNodes(
          nodes.map((n) => ({ path: n.path, x: n.x, y: n.y, z: n.z }))
        );
        new Notice(
          `Saved coordinates for ${saved} visible node${
            saved === 1 ? "" : "s"
          } to frontmatter. New drags will keep saving automatically.`
        );
      }
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.saveCoordinatesToFrontmatter = value;
      });
    }
  );

  addToggle(
    containerEl,
    {
      name: "Show rings",
      value: displaySettings.showRing,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.showRing = value;
      });
    }
  );

  const localDisplaySettings = displaySettings as LocalDisplaySettings;
  const dagDropDown = new Setting(containerEl).setName("Dag orientation");

  const dropdown = new DropdownComponent(dagDropDown.settingEl)
    .addOptions(DagOrientation)
    // the default value will be null
    .setValue(localDisplaySettings.dagOrientation ?? DagOrientation.null)
    .onChange(async (value) => {
      settingManager.updateCurrentSettings((setting: State<LocalGraphSettings>) => {
        if (
          !settingManager.getGraphView().getForceGraph().instance.graphData().isAcyclic() &&
          value !== DagOrientation.null
        ) {
          createNotice("The graph is cyclic, dag orientation will be ignored");
        } else {
          setting.value.display.dagOrientation = value as LocalDisplaySettings["dagOrientation"];
        }
      });
    });

  // if (
  //   settingManager.getGraphView().graphType === GraphType.global ||
  //   (graphSetting as LocalGraphSettings).filter.linkType === "both"
  // ) {
  //   // hide the dag orientation setting
  //   dagDropDown.settingEl.hide();
  // }

  const hideDagOrientationSetting = () => {
    // if the link type is both, then we need to hide the dag orientation setting
    dagDropDown.settingEl.hide();
    // set the dag orientation to null
    settingManager.updateCurrentSettings((setting: State<LocalGraphSettings>) => {
      setting.value.display.dagOrientation = DagOrientation.null;
    });

    // set the UI as well
    dropdown.setValue(DagOrientation.null);
  };

  const showDagOrientationSetting = () => {
    // if the link type is either inlink or outlink, then we need to add the dag orientation setting
    dagDropDown.settingEl.show();
    // set the dag orientation to null
    settingManager.updateCurrentSettings((setting: State<LocalGraphSettings>) => {
      setting.value.display.dagOrientation = DagOrientation.null;
    });

    // set the UI as well
    dropdown.setValue(DagOrientation.null);
  };

  const isDropdownHidden = () => {
    return dagDropDown.settingEl.style.display === "none";
  };

  return {
    hideDagOrientationSetting,
    showDagOrientationSetting,
    isDropdownHidden,
  };
};
