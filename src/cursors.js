export function initGlobalCursorHandlers() {
  const body = document.body;
  const add = () => body.classList.add('dragging');
  const remove = () => body.classList.remove('dragging');
  document.addEventListener('mousedown', add);
  document.addEventListener('mouseup', remove);
  document.addEventListener('touchstart', add, { passive: true });
  document.addEventListener('touchend', remove);
}
