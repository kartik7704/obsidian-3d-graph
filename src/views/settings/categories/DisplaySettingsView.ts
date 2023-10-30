import {
  GlobalGraphSettings,
  LocalDisplaySettings,
  LocalGraphSettings,
  distanceFromFocal,
  linkDistance,
  linkThickness,
  nodeRepulsion,
  nodeSize,
} from "@/SettingManager";
import { addSimpleSliderSetting } from "@/views/atomics/addSimpleSliderSetting";
import { addColorPickerSetting } from "@/views/atomics/addColorPickerSetting";
import { addToggle } from "@/views/atomics/addToggle";
import { DropdownComponent, Setting } from "obsidian";
import { DagOrientation } from "@/SettingsSchemas";
import { GraphSettingManager } from "@/views/settings/GraphSettingsManager";
import { State } from "@/util/State";
import { createNotice } from "@/util/createNotice";

export const DisplaySettingsView = (
  graphSetting: GlobalGraphSettings | LocalGraphSettings,
  containerEl: HTMLElement,
  settingManager: GraphSettingManager
) => {
  const displaySettings = graphSetting.display;
  // add the node size setting
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Node Size",
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
      name: "Link Thickness",
      value: displaySettings.linkThickness,
      stepOptions: linkThickness,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkThickness = value;
      });
    }
  );

  // add link distance settings
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Link Distance",
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
      name: "Node Repulsion",
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

  addColorPickerSetting(
    containerEl,
    {
      name: "Node Hover Color",
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
      name: "Node Hover Neighbour Color",
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
      name: "Link Hover Color",
      value: displaySettings.linkHoverColor,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.linkHoverColor = value;
      });
    }
  );

  // add show extension setting
  addToggle(
    containerEl,
    {
      name: "Show File Extension",
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
      name: "Show Note Full Path",
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
      name: "Show Center Coordinates",
      value: displaySettings.showCenterCoordinates,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.showCenterCoordinates = value;
      });
    }
  );

  addToggle(
    containerEl,
    {
      name: "Show Link Arrow",
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
      name: "Don't Move When Drag",
      value: displaySettings.dontMoveWhenDrag,
    },
    (value) => {
      settingManager.updateCurrentSettings((setting) => {
        setting.value.display.dontMoveWhenDrag = value;
      });
    }
  );

  const localDisplaySettings = displaySettings as LocalDisplaySettings;
  const dagDropDown = new Setting(containerEl).setName("Dag Orientation");

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
