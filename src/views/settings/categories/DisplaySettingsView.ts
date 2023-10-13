import {
  DisplaySettings,
  nodeSize,
  linkDistance,
  linkThickness,
} from "@/settings/categories/DisplaySettings";
import { addSimpleSliderSetting } from "@/views/atomics/addSimpleSliderSetting";
import { State } from "@/util/State";
import { addColorPickerSetting } from "@/views/atomics/addColorPickerSetting";
import { addToggle } from "@/views/atomics/addToggle";

export const DisplaySettingsView = (
  displaySettings: State<DisplaySettings>,
  containerEl: HTMLElement
) => {
  // add the node size setting
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Node Size",
      value: displaySettings.value.nodeSize,
      stepOptions: nodeSize,
    },
    (value) => {
      displaySettings.value.nodeSize = value;
    }
  );

  // add link thinkness setting
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Link Thickness",
      value: displaySettings.value.linkThickness,
      stepOptions: linkThickness,
    },
    (value) => {
      displaySettings.value.linkThickness = value;
    }
  );

  // add link distance settings
  addSimpleSliderSetting(
    containerEl,
    {
      name: "Link Distance",
      value: displaySettings.value.linkDistance,
      stepOptions: linkDistance,
    },
    (value) => {
      displaySettings.value.linkDistance = value;
    }
  );

  // add node hover color setting
  console.log("adding node hover", displaySettings.value.nodeHoverColor);
  addColorPickerSetting(
    containerEl,
    {
      name: "Node Hover Color",
      value: displaySettings.value.nodeHoverColor,
    },
    (value) => (displaySettings.value.nodeHoverColor = value)
  );

  // add node hover color setting
  addColorPickerSetting(
    containerEl,
    {
      name: "Node Hover Neighbour Color",
      value: displaySettings.value.nodeHoverNeighbourColor,
    },
    (value) => (displaySettings.value.nodeHoverNeighbourColor = value)
  );

  // add link hover color setting
  addColorPickerSetting(
    containerEl,
    {
      name: "Link Hover Color",
      value: displaySettings.value.linkHoverColor,
    },
    (value) => (displaySettings.value.linkHoverColor = value)
  );

  // add show extension setting
  addToggle(
    containerEl,
    {
      name: "Show File Extension",
      value: displaySettings.value.showExtension,
    },
    (value) => (displaySettings.value.showExtension = value)
  );

  // add show full path setting
  addToggle(
    containerEl,
    {
      name: "Show Note Full Path",
      value: displaySettings.value.showFullPath,
    },
    (value) => (displaySettings.value.showFullPath = value)
  );
};
