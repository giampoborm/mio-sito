import Matter from 'matter-js';
import { measureTextDimensions } from './generalUtils.js';

// Color palette for highlight
const PRIMARY_COLORS = ['#FF0000', '#FFFF00', '#0000FF', '#FFA500', '#008000'];

// Utility: pick a random color
export function pickRandomPrimary() {
  return PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)];
}

/**
 * Creates nav menu with tight Matter.js boxes and "against the wall" layout.
 * @param {Matter.World} world
 * @param {HTMLElement} container
 * @param {string} currentPage - '/', '/who', or '/what'
 * @returns {Array} for syncDOMWithBodies
 */
export function createPhysicsNavMenu(world, container, currentPage) {
  const navButtons = [
    { label: 'who?', path: '/who', id: 'who' },
    { label: '?',    path: '/',    id: 'home' },
    { label: 'what?', path: '/what', id: 'what' }
  ];

  // Pick highlight color once per load
  if (!window.__navHighlightColor) window.__navHighlightColor = pickRandomPrimary();
  const highlightColor = window.__navHighlightColor;

  const bodies = [];
  const margin = 18; // Smallest gap from edge (adjust to taste)
  const y = 40;      // Vertically near the top

  navButtons.forEach((btn, index) => {
    // Use helper for dimensions
    const { width, height } = measureTextDimensions(btn.label, 'nav-button');

    // Placement: left, center, right
    let x;
    if (index === 0) {
      // Left edge: half width + margin
      x = margin + width / 2;
    } else if (index === 1) {
      // Center: exactly centered
      x = window.innerWidth / 2;
    } else if (index === 2) {
      // Right edge: window width - half width - margin
      x = window.innerWidth - margin - width / 2;
    }

    // DOM setup
    const el = document.createElement('div');
    el.textContent = btn.label;
    el.className = 'nav-button';
    el.style.position = 'absolute';
    el.style.cursor = 'pointer';
    el.style.fontFamily = 'inherit';
    el.style.userSelect = 'none';
    el.style.background = 'transparent';

    // Highlight logic (NO underline)
    const isActive =
      (currentPage === '/' && btn.id === 'home') ||
      (currentPage === '/who' && btn.id === 'who') ||
      (currentPage === '/what' && btn.id === 'what');
    if (isActive) {
      el.style.color = highlightColor;
      el.style.textDecoration = 'none'; // explicitly no underline
    } else {
      el.style.color = '#000';
    }

    // SPA navigation
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.location.pathname !== btn.path) {
        history.pushState({}, '', btn.path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    });

    // Add to DOM and physics
    container.appendChild(el);

    // Physics: TIGHT bounding box, no added spacing
    const body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true
    });
    Matter.World.add(world, body);
    bodies.push({ body, domElement: el });
  });

  return bodies;
}
