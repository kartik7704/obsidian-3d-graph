import { DisplaySettings } from "@/settings/categories/DisplaySettings";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { GroupSettings } from "@/settings/categories/GroupSettings";

export class GraphSettings {
  filters: FilterSettings;
  groups: GroupSettings;
  display: DisplaySettings;

  constructor(
    filterOptions: FilterSettings,
    groupOptions: GroupSettings,
    displayOptions: DisplaySettings
  ) {
    this.filters = filterOptions;
    this.groups = groupOptions;
    this.display = displayOptions;
  }

  public reset() {
    Object.assign(this.filters, new FilterSettings());
    Object.assign(this.groups, new GroupSettings());
    Object.assign(this.display, new DisplaySettings());
  }

  public toObject() {
    return {
      filters: this.filters.toObject(),
      groups: this.groups.toObject(),
      display: this.display.toObject(),
    };
  }
}
