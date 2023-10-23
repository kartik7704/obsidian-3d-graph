import {
  nodeSize,
  linkDistance,
  linkThickness,
  nodeRepulsion,
} from "@/settings/categories/DisplaySettings";
import { GlobalGraphSettings, LocalDisplaySettings, LocalGraphSettings } from "@/SettingManager";
import { addSimpleSliderSetting } from "@/views/atomics/addSimpleSliderSetting";
import { addColorPickerSetting } from "@/views/atomics/addColorPickerSetting";
import { addToggle } from "@/views/atomics/addToggle";
import { DropdownComponent, Setting } from "obsidian";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";
import { DagOrientation, GraphType } from "@/SettingsSchemas";

export const DisplaySettingsView = (
  graphSetting: GlobalGraphSettings | LocalGraphSettings,
  containerEl: HTMLElement,
  settingManager: NewGraph3dView["settingManager"]
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
        setting.display.nodeSize = value;
        return setting;
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
        setting.display.linkThickness = value;
        return setting;
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
        setting.display.linkDistance = value;
        return setting;
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
        setting.display.nodeRepulsion = value;
        return setting;
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
        setting.display.nodeHoverColor = value;
        return setting;
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
        setting.display.nodeHoverNeighbourColor = value;
        return setting;
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
        setting.display.linkHoverColor = value;
        return setting;
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
        setting.display.showExtension = value;
        return setting;
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
        setting.display.showFullPath = value;
        return setting;
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
        setting.display.showCenterCoordinates = value;
        return setting;
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
        setting.display.showLinkArrow = value;
        return setting;
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
        setting.display.dontMoveWhenDrag = value;
        return setting;
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
      settingManager.updateCurrentSettings((setting: LocalGraphSettings) => {
        setting.display.dagOrientation = value as LocalDisplaySettings["dagOrientation"];
        return setting;
      });
    });

  if (
    settingManager.getGraphView().graphType === GraphType.global ||
    (graphSetting as LocalGraphSettings).filter.linkType === "both"
  ) {
    // hide the dag orientation setting
    dagDropDown.settingEl.hide();
  }

  const hideDagOrientationSetting = () => {
    // if the link type is both, then we need to hide the dag orientation setting
    dagDropDown.settingEl.hide();
    // set the dag orientation to null
    settingManager.updateCurrentSettings((setting: LocalGraphSettings) => {
      setting.display.dagOrientation = DagOrientation.null;
      return setting;
    });

    // set the UI as well
    dropdown.setValue(DagOrientation.null);
  };

  const showDagOrientationSetting = () => {
    // if the link type is either inlink or outlink, then we need to add the dag orientation setting
    dagDropDown.settingEl.show();
    // set the dag orientation to null
    settingManager.updateCurrentSettings((setting: LocalGraphSettings) => {
      setting.display.dagOrientation = DagOrientation.null;
      return setting;
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
