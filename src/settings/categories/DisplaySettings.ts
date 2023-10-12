export class DisplaySettings {
	nodeSize = 4;
	linkThickness = 5;

	constructor(nodeSize?: number, linkThickness?: number) {
		this.nodeSize = nodeSize ?? this.nodeSize;
		this.linkThickness = linkThickness ?? this.linkThickness;
	}

	public static fromStore(store: any) {
		return new DisplaySettings(store?.nodeSize, store?.linkThickness);
	}

	public toObject() {
		return {
			nodeSize: this.nodeSize,
			linkThickness: this.linkThickness,
		};
	}
}
