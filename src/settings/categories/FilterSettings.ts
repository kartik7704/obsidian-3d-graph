const DEFAULT_SHOW_ORPHANS = true;
const DEFAULT_SEARCH_QUERY = "";

export class FilterSettings {
  searchQuery = DEFAULT_SEARCH_QUERY;
  showOrphans = DEFAULT_SHOW_ORPHANS;

  constructor(showOrphans = DEFAULT_SHOW_ORPHANS, searchQuery = DEFAULT_SEARCH_QUERY) {
    this.showOrphans = showOrphans;
    this.searchQuery = searchQuery;
  }

  public toObject() {
    return {
      showOrphans: this.showOrphans,
      searchQuery: this.searchQuery,
    };
  }
}
