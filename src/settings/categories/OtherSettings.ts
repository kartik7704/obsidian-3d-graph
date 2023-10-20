const DEFAULT_MAX_NODE_NUMBER = 200;
const DEFAULT_USE_DATAVIEW = false;

export class OtherSettings {
  maxNodeNumber = DEFAULT_MAX_NODE_NUMBER;
  useDataView = DEFAULT_USE_DATAVIEW;

  constructor({
    maxNodeNumber = DEFAULT_MAX_NODE_NUMBER,
    useDataView = DEFAULT_USE_DATAVIEW,
  }: {
    maxNodeNumber?: number;
    useDataView?: boolean;
  } = {}) {
    this.maxNodeNumber = maxNodeNumber;
    this.useDataView = useDataView;
  }

  public toObject() {
    const { toObject: _, ...others } = this;
    return {
      ...others,
    };
  }
}
