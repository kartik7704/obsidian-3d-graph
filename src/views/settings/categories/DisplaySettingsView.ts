import { DisplaySettings } from '@/settings/categories/DisplaySettings';
import {
  SimpleSliderSetting,
  DEFAULT_SLIDER_STEP_OPTIONS,
  SliderOptions,
} from '@/views/atomics/SimpleSliderSetting';
import { State } from '@/util/State';

export const DisplaySettingsView = (
  displaySettings: State<DisplaySettings>,
  containerEl: HTMLElement
) => {
  NodeSizeSetting(displaySettings, containerEl);
  LinkThicknessSetting(displaySettings, containerEl);
};

const NodeSizeSetting = (displaySettings: State<DisplaySettings>, containerEl: HTMLElement) => {
  const options: SliderOptions = {
    name: 'Node Size',
    value: displaySettings.value.nodeSize,
    stepOptions: DEFAULT_SLIDER_STEP_OPTIONS,
  };
  return SimpleSliderSetting(containerEl, options, (value) => {
    displaySettings.value.nodeSize = value;
  });
};

const LinkThicknessSetting = (
  displaySettings: State<DisplaySettings>,
  containerEl: HTMLElement
) => {
  const options: SliderOptions = {
    name: 'Link Thickness',
    value: displaySettings.value.linkThickness,
    stepOptions: DEFAULT_SLIDER_STEP_OPTIONS,
  };
  return SimpleSliderSetting(containerEl, options, (value) => {
    displaySettings.value.linkThickness = value;
  });
};
