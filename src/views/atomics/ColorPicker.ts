/**
 * append a color picker to the container element
 */
export const ColorPicker = (
  containerEl: HTMLElement,
  /**
   * the current color
   */
  value: string,
  /**
   * callback for when the color is changed
   */
  onChange: (value: string) => void
) => {
  const input = document.createElement('input');
  input.type = 'color';
  input.value = value;
  input.addEventListener('change', () => {
    onChange(input.value);
  });
  containerEl.appendChild(input);
};
