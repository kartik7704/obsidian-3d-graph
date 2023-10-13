const DEFAULT_SHOW_ORPHANS = true;

export class FilterSettings {
  showOrphans = DEFAULT_SHOW_ORPHANS;

  constructor(showOrphans = DEFAULT_SHOW_ORPHANS) {
    this.showOrphans = showOrphans;
  }

  public toObject() {
    return {
      showOrphans: this.showOrphans,
    };
  }
}
