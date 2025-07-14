const PALETTE = [
  '#ff1d25', // red
  '#ff931e', // orange
  '#ffef00', // yellow
  '#00a650', // green
  '#0072ce', // blue
  '#9b26b6'  // purple
];

const cycleState = {};

function pickDistinct(last, avoid = []) {
  const avoidSet = new Set(avoid);
  if (last) avoidSet.add(last);
  const options = PALETTE.filter(c => !avoidSet.has(c));
  if (options.length === 0) return PALETTE[0];
  return options[Math.floor(Math.random() * options.length)];
}

function nextColour(key, strategy = 'cycle') {
  if (key == null) key = 'default';
  if (strategy === 'cycle') {
    const idx = cycleState[key] || 0;
    cycleState[key] = (idx + 1) % PALETTE.length;
    return PALETTE[idx % PALETTE.length];
  }
  if (strategy === 'hash') {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) - hash + key.charCodeAt(i);
      hash |= 0;
    }
    return PALETTE[Math.abs(hash) % PALETTE.length];
  }
  return PALETTE[0];
}

function persist(key, colour, store = 'local') {
  try {
    const s = store === 'session' ? window.sessionStorage : window.localStorage;
    s.setItem(key, colour);
  } catch (e) {}
}

function recall(key, store = 'local') {
  try {
    const s = store === 'session' ? window.sessionStorage : window.localStorage;
    return s.getItem(key);
  } catch (e) {
    return null;
  }
}

export { PALETTE, pickDistinct, nextColour, persist, recall };
