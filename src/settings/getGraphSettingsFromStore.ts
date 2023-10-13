import { DisplaySettings } from "@/settings/categories/DisplaySettings";
import { FilterSettings } from "@/settings/categories/FilterSettings";
import { GroupSettings } from "@/settings/categories/GroupSettings";
import { GraphSettings } from "@/settings/GraphSettings";

export const getGraphSettingsFromStore = (
  // app: App,
  // TODO: this type need to be fixed
  store: {
    filters: Prettify<ReturnType<(typeof FilterSettings.prototype)["toObject"]>>;
    groups: Prettify<ReturnType<(typeof GroupSettings.prototype)["toObject"]>>;
    display: Prettify<ReturnType<(typeof DisplaySettings.prototype)["toObject"]>>;
  }
) => {
  return new GraphSettings(
    // app,
    new FilterSettings(store.filters),
    new GroupSettings(store.groups),
    new DisplaySettings(store.display)
  );
};
