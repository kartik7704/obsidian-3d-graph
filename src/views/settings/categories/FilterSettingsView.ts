import { Setting } from "obsidian";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { State } from "@/util/State";

import { addSearchInput } from "@/views/atomics/addSearchInput";
import { Graph3dView } from "@/views/graph/Graph3dView";

export const FilterSettingsView = async (
  filterSettings: State<FilterSettings>,
  containerEl: HTMLElement,
  graphView: Graph3dView
) => {
  const plugin = graphView.plugin;
  const [_, triggerSearch] = await addSearchInput(
    containerEl,
    filterSettings.value.searchQuery,
    (value, files, init) => {
      filterSettings.value.searchQuery = value;
      plugin.searchState.value.filter.query = value;
      plugin.searchState.value.filter.files = files;
    },
    plugin
  );
  graphView.searchTriggers["filter"] = triggerSearch;

  const dv = plugin.getDvApi();
  // if user have dv installed, they can use dv query
  if (dv && plugin.settingsState.value.other.useDataView) {
    const dvQuerySetting = new Setting(containerEl).addText((text) => {
      text
        .setValue(filterSettings.value.dvQuery || "")
        .setPlaceholder("Dv Query")
        .onChange(async (value) => {
          filterSettings.value.dvQuery = value;
        });

      text.inputEl.parentElement?.addClass("search-input-container");
    });

    const el = dvQuerySetting.infoEl;
    if (el) el.style.display = "none";
  }

  // add show attachments setting
  new Setting(containerEl).setName("Show Attachments").addToggle((toggle) => {
    toggle.setValue(filterSettings.value.showAttachments || false).onChange(async (value) => {
      filterSettings.value.showAttachments = value;
    });
  });

  // add show orphans setting
  new Setting(containerEl).setName("Show Orphans").addToggle((toggle) => {
    toggle.setValue(filterSettings.value.showOrphans || false).onChange(async (value) => {
      filterSettings.value.showOrphans = value;
    });
  });
};
