const DEFAULT_SHOW_ORPHANS = true;
const DEFAULT_SHOW_ATTACHMENTS = false;
const DEFAULT_SEARCH_QUERY = "";
const DEFAULT_DV_QUERY = "";

export class FilterSettings {
  searchQuery = DEFAULT_SEARCH_QUERY;
  showOrphans = DEFAULT_SHOW_ORPHANS;
  showAttachments = DEFAULT_SHOW_ATTACHMENTS;
  dvQuery = DEFAULT_DV_QUERY;

  constructor({
    showOrphans = DEFAULT_SHOW_ORPHANS,
    searchQuery = DEFAULT_SEARCH_QUERY,
    showAttachments = DEFAULT_SHOW_ATTACHMENTS,
    dvQuery = DEFAULT_DV_QUERY,
  }: {
    showOrphans?: boolean;
    searchQuery?: string;
    showAttachments?: boolean;
    dvQuery?: string;
  } = {}) {
    this.showOrphans = showOrphans;
    this.searchQuery = searchQuery;
    this.showAttachments = showAttachments;
    this.dvQuery = dvQuery;
  }

  public toObject() {
    const { toObject: _, ...others } = this;
    return {
      ...others,
    };
  }
}
