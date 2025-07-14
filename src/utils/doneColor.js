export function markDone(element) {
  if (!element) return;
  const color = element.dataset.highlightColor || window.__navHighlightColor || '#ff0000';
  element.style.color = color;
  element.dataset.done = 'true';
}
