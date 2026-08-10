import { Notice } from "obsidian";

export const createNotice = (message: string | DocumentFragment, duration?: number): Notice =>
  new Notice(`3D graph: ${message}`, duration);
