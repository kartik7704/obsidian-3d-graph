import { NodeGroup } from '@/graph/NodeGroup';
import { DisplaySettings } from '@/settings/categories/DisplaySettings';
import { FilterSettings } from '@/settings/categories/FilterSettings';
import { GroupSettings } from '@/settings/categories/GroupSettings';
import { GraphSettings } from '@/settings/GraphSettings';

export const getGraphSettingsFromStore = (store: {
  filters: { showOrphans?: boolean };
  groups: { groups?: NodeGroup[] };
  display: {
    nodeSize?: number;
    linkThickness?: number;
    linkDistance?: number;
  };
}) => {
  return new GraphSettings(
    new FilterSettings(store.filters.showOrphans),
    new GroupSettings(store.groups.groups),
    new DisplaySettings(
      store.display.nodeSize,
      store.display.linkThickness,
      store.display.linkDistance
    )
  );
};
