import { Setting } from 'obsidian';
import { FilterSettings } from '@/settings/categories/FilterSettings';
import { State } from '@/util/State';

export const FilterSettingsView = (
  filterSettings: State<FilterSettings>,
  containerEl: HTMLElement
) => {
  new Setting(containerEl).setName('Show Orphans').addToggle((toggle) => {
    toggle.setValue(filterSettings.value.showOrphans || false).onChange(async (value) => {
      filterSettings.value.showOrphans = value;
    });
  });
};
