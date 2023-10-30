import { defaultGlobalGraphSetting } from "@/SettingManager";
import { z } from "zod";

export enum GraphType {
  /**
   * the global graph
   */
  global = "global",
  /**
   * the local graph
   */
  local = "local",
}

export enum SearchEngineType {
  dataview = "dataview",
  default = "default",
  builtIn = "builtIn",
}

export enum DagOrientation {
  td = "td",
  bu = "bu",
  lr = "lr",
  rl = "rl",
  zout = "zout",
  zin = "zin",
  radialout = "radialout",
  radialin = "radialin",
  null = "null",
}

export const BaseDisplaySettingsSchema = z.object({
  nodeSize: z.number().default(defaultGlobalGraphSetting.display.nodeSize),
  linkThickness: z.number().default(defaultGlobalGraphSetting.display.linkThickness),
  linkDistance: z.number().default(defaultGlobalGraphSetting.display.linkDistance),
  nodeRepulsion: z.number().default(defaultGlobalGraphSetting.display.nodeRepulsion),
  distanceFromFocal: z.number().default(defaultGlobalGraphSetting.display.distanceFromFocal),
  nodeHoverColor: z.string().default(defaultGlobalGraphSetting.display.nodeHoverColor),
  nodeHoverNeighbourColor: z
    .string()
    .default(defaultGlobalGraphSetting.display.nodeHoverNeighbourColor),
  linkHoverColor: z.string().default(defaultGlobalGraphSetting.display.linkHoverColor),
  showExtension: z.boolean().default(defaultGlobalGraphSetting.display.showExtension),
  showFullPath: z.boolean().default(defaultGlobalGraphSetting.display.showFullPath),
  showCenterCoordinates: z
    .boolean()
    .default(defaultGlobalGraphSetting.display.showCenterCoordinates),
  showLinkArrow: z.boolean().default(defaultGlobalGraphSetting.display.showLinkArrow),
  dontMoveWhenDrag: z.boolean().default(defaultGlobalGraphSetting.display.dontMoveWhenDrag),
  dagOrientation: z.undefined().or(z.nativeEnum(DagOrientation)).default(DagOrientation.null),
});
export const LocalDisplaySettingsSchema = z.object({
  ...BaseDisplaySettingsSchema.shape,
});
export const LocalFilterSettingSchema = z.object({
  searchQuery: z.string(),
  showOrphans: z.boolean(),
  showAttachments: z.boolean(),
  depth: z.number(),
  linkType: z.literal("inlinks").or(z.literal("outlinks")).or(z.literal("both")),
});
export const BaseFilterSettingsSchema = z.object({
  searchQuery: z.string(),
  showOrphans: z.boolean(),
  showAttachments: z.boolean(),
});
export const GroupSettingsSchema = z.array(
  z.object({
    query: z.string(),
    color: z.string(),
  })
);
export const GlobalGraphSettingsSchema = z.object({
  filter: BaseFilterSettingsSchema,
  groups: GroupSettingsSchema,
  display: BaseDisplaySettingsSchema,
});
export const LocalGraphSettingsSchema = z.object({
  filter: LocalFilterSettingSchema,
  groups: GroupSettingsSchema,
  display: LocalDisplaySettingsSchema,
});
export const SavedSettingSchema = z.object({
  title: z.string(),
  id: z.string(),
  setting: GlobalGraphSettingsSchema.or(LocalGraphSettingsSchema),
  type: z.nativeEnum(GraphType),
});
export const SettingSchema = z.object({
  savedSettings: z.array(SavedSettingSchema),
  temporaryLocalGraphSetting: LocalGraphSettingsSchema,
  temporaryGlobalGraphSetting: GlobalGraphSettingsSchema,
  pluginSetting: z.object({
    maxNodeNumber: z.number(),
    searchEngine: z.nativeEnum(SearchEngineType),
  }),
});
