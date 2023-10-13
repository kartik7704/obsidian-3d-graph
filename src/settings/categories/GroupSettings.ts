import { NodeGroup } from "@/graph/NodeGroup";

const DEFAULT_NODE_GROUPS: NodeGroup[] = [];

export class GroupSettings {
  groups = Array.from(DEFAULT_NODE_GROUPS);

  constructor({ groups = Array.from(DEFAULT_NODE_GROUPS) }: { groups?: NodeGroup[] } = {}) {
    this.groups = groups;
  }

  public toObject() {
    return {
      groups: this.groups,
    };
  }
}
