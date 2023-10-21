import { DisplaySettings } from "@/settings/categories/DisplaySettings";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { OtherSettings } from "@/settings/categories/OtherSettings";

export class GraphSettings {
  filters: FilterSettings;
  groups: GroupSettings;
  display: DisplaySettings;
  other: OtherSettings;

  constructor(
    filterOptions: FilterSettings,
    groupOptions: GroupSettings,
    displayOptions: DisplaySettings,
    otherOptions: OtherSettings
  ) {
    this.filters = filterOptions;
    this.groups = groupOptions;
    this.display = displayOptions;
    this.other = otherOptions;
  }

  public reset() {
    Object.assign(this.filters, new FilterSettings());
    Object.assign(this.groups, new GroupSettings());
    Object.assign(this.display, new DisplaySettings());
    Object.assign(
      this.other,
      new OtherSettings({
        // this will not be reset
        maxNodeNumber: this.other.maxNodeNumber,
      })
    );
  }

  public toObject() {
    return {
      filters: this.filters.toObject(),
      groups: this.groups.toObject(),
      display: this.display.toObject(),
      other: this.other.toObject(),
    };
  }
}
