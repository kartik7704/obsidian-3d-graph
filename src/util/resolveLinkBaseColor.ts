// An unset custom color falls back to the Obsidian theme's graph line color, so the
// option changes nothing until it's picked. Arrowheads take their color from the link,
// so this one value covers both.
export const resolveLinkBaseColor = (customColor: string, themeColor: string): string =>
  customColor || themeColor;
