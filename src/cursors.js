export function initGlobalCursorHandlers() {
  const body = document.body;

  function shouldShowDrag(e) {
    const container = document.getElementById('container');
    if (container && e.target === container) {
      const cur = container.style.cursor || '';
      if (cur.includes('just-click.svg') || cur.includes('next.svg')) {
        return false;
      }
    }
    return true;
  }

  const add = (e) => {
    if (shouldShowDrag(e)) {
      body.classList.add('dragging');
    }
  };
  const remove = () => body.classList.remove('dragging');
  document.addEventListener('mousedown', add);
  document.addEventListener('mouseup', remove);
  document.addEventListener('touchstart', add, { passive: true });
  document.addEventListener('touchend', remove);
}
