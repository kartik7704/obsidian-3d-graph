const DEFAULT_SHOW_ORPHANS = true;
const DEFAULT_SHOW_ATTACHMENTS = false;
const DEFAULT_SEARCH_QUERY = "";

export class FilterSettings {
  searchQuery = DEFAULT_SEARCH_QUERY;
  searchResult: string[] = [];
  showOrphans = DEFAULT_SHOW_ORPHANS;
  showAttachments = DEFAULT_SHOW_ATTACHMENTS;

  constructor({
    showOrphans = DEFAULT_SHOW_ORPHANS,
    searchQuery = DEFAULT_SEARCH_QUERY,
    searchResult = [],
    showAttachments = DEFAULT_SHOW_ATTACHMENTS,
  }: {
    showOrphans?: boolean;
    searchQuery?: string;
    searchResult?: string[];
    showAttachments?: boolean;
  } = {}) {
    this.showOrphans = showOrphans;
    this.searchQuery = searchQuery;
    this.searchResult = searchResult;
    this.showAttachments = showAttachments;
  }

  public toObject() {
    const { toObject: _, ...others } = this;
    return {
      ...others,
    };
  }
}
