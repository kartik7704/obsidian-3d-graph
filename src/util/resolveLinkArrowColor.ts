// "" makes three-forcegraph fall back to the link's own color, which is how a
// highlighted link keeps its hover color and how an unset option changes nothing.
export const resolveLinkArrowColor = (customColor: string, isHighlighted: boolean): string =>
  customColor && !isHighlighted ? customColor : "";
