const IMAGE_EXTENSIONS = new Set(["svg", "png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"]);

/**
 * Image attachments (svg, png, etc.) never have their own outgoing/incoming
 * links worth graphing and add no navigable content as a node - unlike other
 * attachment types (.base, .canvas, .pdf), which the showAttachments toggle
 * should still govern. Always excluded, independent of that setting.
 */
export const isImageAttachment = (path: string): boolean => {
  const ext = path.split(".").pop()?.toLowerCase();
  return !!ext && IMAGE_EXTENSIONS.has(ext);
};
