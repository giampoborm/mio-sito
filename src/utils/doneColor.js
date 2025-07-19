import { getNavHighlightColor, COLORS } from './colorSystem.js';

export function markDone(element) {
  if (!element) return;
  const color = element.dataset.highlightColor || getNavHighlightColor() || COLORS[0];
  element.style.color = color;
  element.dataset.done = 'true';
}
