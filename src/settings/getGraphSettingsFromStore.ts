import { NodeGroup } from "@/graph/NodeGroup";
import { DisplaySettings } from "@/settings/categories/DisplaySettings";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { GraphSettings } from "@/settings/GraphSettings";

export const getGraphSettingsFromStore = (
  // app: App,
  // TODO: this type need to be fixed
  store: {
    filters: { showOrphans?: boolean; searchQuery?: string };
    groups: { groups?: NodeGroup[] };
    display: {
      nodeSize?: number;
      linkThickness?: number;
      linkDistance?: number;
    };
  }
) => {
  return new GraphSettings(
    // app,
    new FilterSettings(store.filters.showOrphans, store.filters.searchQuery),
    new GroupSettings(store.groups.groups),
    new DisplaySettings(
      store.display.nodeSize,
      store.display.linkThickness,
      store.display.linkDistance
    )
  );
};
