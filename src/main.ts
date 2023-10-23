import { Plugin } from "obsidian";
import { State } from "@/util/State";
import { Graph } from "@/graph/Graph";
import { ObsidianTheme } from "@/util/ObsidianTheme";
import { ResolvedLinkCache } from "@/graph/Link";
import { deepCompare } from "@/util/deepCompare";
import "@total-typescript/ts-reset";
import "@total-typescript/ts-reset/dom";
import { eventBus } from "@/util/EventBus";
import { SettingTab } from "@/settings/SettingTab";
import { config } from "@/config";
import { MyFileManager } from "@/FileManager";
import { BasicSearchEngine } from "@/BasicSearchEngine";
import { DvSearchEngine } from "@/DvSearchEngine";
import { MySettingManager } from "@/SettingManager";
import { GraphType, SearchEngineType } from "@/SettingsSchemas";
import { SearchManager } from "@/SearchManager";
import { NewGraph3dView } from "@/views/graph/NewGraph3dView";

export default class Graph3dPlugin extends Plugin {
  _resolvedCache: ResolvedLinkCache;
  private cacheIsReady: State<boolean> = new State(
    this.app.metadataCache.resolvedLinks !== undefined
  );
  /**
   *  we keep a global graph here because we dont want to create a new graph every time we open a graph view
   */
  public globalGraph: Graph;
  public theme: ObsidianTheme;

  public fileManager: MyFileManager;
  public settingManager: MySettingManager;
  public searchManager: SearchManager;

  public activeGraphViews: NewGraph3dView[] = [];

  /**
   * initialize all the things here
   */
  async onload() {
    // initialize the setting manager
    this.settingManager = new MySettingManager(this);

    // load the setting using setting manager
    const settings = await this.settingManager.loadSettings();

    // get the setting from setting manager
    // const setting = this.settingManager.getSetting("test");

    // initalise the file manager
    this.fileManager = new MyFileManager(
      this,
      settings.pluginSetting.searchEngine === SearchEngineType.dataview
        ? new DvSearchEngine(this)
        : new BasicSearchEngine(this)
    );

    // init the theme
    this.theme = new ObsidianTheme(this.app.workspace.containerEl);
    this.cacheIsReady.value = this.app.metadataCache.resolvedLinks !== undefined;
    this.onGraphCacheChanged();

    // init listeners
    this.initListeners();

    this.addRibbonIcon(config.icon, config.displayText.global, this.openGlobalGraph);

    this.addCommand({
      id: "open-3d-graph-global",
      name: "Open Global 3D Graph",
      callback: this.openGlobalGraph,
    });

    this.addCommand({
      id: "open-3d-graph-local",
      name: "Open Local 3D Graph",
      callback: this.openLocalGraph,
    });

    this.addSettingTab(new SettingTab(this.app, this));

    // register global view
    this.registerView(config.viewType.global, (leaf) => {
      return new NewGraph3dView(this, leaf, GraphType.global);
    });

    // register local view
    this.registerView(config.viewType.local, (leaf) => {
      return new NewGraph3dView(this, leaf, GraphType.local);
    });
  }

  private initListeners() {
    // all files are resolved, so the cache is ready:
    this.app.metadataCache.on("resolved", this.onGraphCacheReady);
    // the cache changed:
    this.app.metadataCache.on("resolve", this.onGraphCacheChanged);

    // show open local graph button in file menu
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!file) return;
        menu.addItem((item) => {
          item
            .setTitle("Open in local 3D Graph")
            .setIcon(config.icon)
            .onClick(() => this.openLocalGraph());
        });
      })
    );
  }

  private onGraphCacheReady = () => {
    console.log("Graph cache is ready");
    this.cacheIsReady.value = true;
    this.onGraphCacheChanged();
  };

  public onGraphCacheChanged = () => {
    // check if the cache actually updated
    // Obsidian API sends a lot of (for this plugin) unnecessary stuff
    // with the resolve event
    if (
      this.cacheIsReady.value &&
      !deepCompare(this._resolvedCache, this.app.metadataCache.resolvedLinks)
    ) {
      this._resolvedCache = structuredClone(this.app.metadataCache.resolvedLinks);
      this.globalGraph = Graph.createFromApp(this.app);
    } else {
      console.log(
        "changed but ",
        this.cacheIsReady.value,
        " and ",
        deepCompare(this._resolvedCache, this.app.metadataCache.resolvedLinks)
      );
    }
  };

  /**
   * Opens a local graph view in a new leaf
   */
  private openLocalGraph = () => {
    this.openGraph(GraphType.local);
  };

  /**
   * Opens a global graph view in the current leaf
   */
  private openGlobalGraph = () => {
    this.openGraph(GraphType.global);
  };

  /**
   * this function will open a graph view in the current leaf
   */
  private openGraph = async (graphType: GraphType) => {
    eventBus.trigger("open-graph");
    const leaf = this.app.workspace.getLeaf(graphType === GraphType.local ? "split" : false);
    await leaf.setViewState({
      type: graphType === GraphType.local ? config.viewType.local : config.viewType.global,
      active: true,
    });
  };
}
