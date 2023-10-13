import { ExtraButtonComponent, TextComponent } from 'obsidian';
import { NodeGroup } from '@/graph/NodeGroup';
import { State } from '@/util/State';
import { ColorPicker } from '@/views/atomics/ColorPicker';

/**
 * given a group and a container element, create a group setting item
 */
export const AddNodeGroupItem = (
  group: State<NodeGroup>,
  containerEl: HTMLElement,
  onDelete: () => void
) => {
  const groupEl = containerEl.createDiv({ cls: 'graph-color-group' });

  new TextComponent(groupEl).setValue(group.value.query).onChange((value) => {
    group.value.query = value;
  });

  ColorPicker(groupEl, group.value.color, (value) => {
    group.value.color = value;
  });

  new ExtraButtonComponent(groupEl).setIcon('cross').setTooltip('Delete Group').onClick(onDelete);
};
