export const COLORS = ['#FE2712', '#0247FE', '#FEFE33'];

export function getRandomColor(exclude = []) {
  const available = COLORS.filter(c => !exclude.includes(c));
  const list = available.length ? available : COLORS;
  return list[Math.floor(Math.random() * list.length)];
}

export function shuffleColors() {
  const arr = [...COLORS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function setNavHighlightColor(color) {
  window.__navHighlightColor = color;
}

export function getNavHighlightColor() {
  return window.__navHighlightColor;
}
