// src/utils/whatPhysics.js

import Matter from 'matter-js';
import {
  initializeMatterEngine,
  createViewportBoundaries,
  syncDOMWithBodies,      // Expects this to return a cleanup function
  enableDragging,
  enableDeviceGravity,    // Expects this to return a cleanup function
  isMobile,
  setGravity,
  handleResize,           // Expects this to return a cleanup function
} from './physicsSetup.js';
import projectsData from '../data/projects.json';
import {
  spawnCenterText,
  measureTextDimensions,
  measureTextDimensionsAfterFonts,
  loadAndMeasureImage,
  loadAndMeasureVideo,
  prefetchProjectAssets,
  prefetchSummaryAssets
} from './generalUtils.js';
import { createPhysicsNavMenu, pickRandomPrimary } from './navButtons.js';
import { createWhatProjectNav } from './whatNav.js'; // Ensure class name 'what-nav-button' is used by this
import { openFullProjectModal } from './fullProjectModal.js';
import { markDone } from './doneColor.js';

function getMobileScaling() {
  const width = window.innerWidth;
  let base;
  if (width >= 400) {
    base = 1;
  } else if (width <= 360) {
    base = 0.7;
  } else {
    // Linearly interpolate between 100% at 400px and 70% at 360px
    base = 0.7 + ((width - 360) / 40) * 0.3;
  }
  return {
    image: 0.45 * base,
    video: 0.1 * base,
    text: base,
    button: base,
  };
}

const DESKTOP_SCALING = { // Original scales you were using
  image: 0.75,
  video: 0.15,
  text: 1.0,    // Assuming no explicit scaling for text/button bodies before
  button: 1.0,
};

const clampValue = (value, min, max) => {
  if (!Number.isFinite(value)) {
    if (Number.isFinite(min) && Number.isFinite(max)) {
      return (min + max) / 2;
    }
    return 0;
  }
  if (min > max) {
    return Number.isFinite(min) && Number.isFinite(max)
      ? (min + max) / 2
      : value;
  }
  return Math.min(Math.max(value, min), max);
};

const computeViewportMargins = (viewportWidth, viewportHeight) => {
  const marginX = Math.min(Math.max(viewportWidth * 0.06, 32), viewportWidth / 3);
  const marginY = Math.min(Math.max(viewportHeight * 0.1, 48), viewportHeight / 3);
  return { marginX, marginY };
};

const createScatterPlanner = (totalCount, viewportWidth, viewportHeight) => {
  const count = Math.max(totalCount, 1);
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const { marginX, marginY } = computeViewportMargins(viewportWidth, viewportHeight);
  const jitterScale = 0.35;
  let index = 0;

  return ({ width = 0, height = 0 } = {}) => {
    const currentIndex = index;
    index += 1;

    if (currentIndex >= count) {
      return {
        x: viewportWidth / 2,
        y: viewportHeight / 2,
      };
    }

    const row = Math.floor(currentIndex / columns);
    let col = currentIndex % columns;
    if (row % 2 === 1) {
      col = columns - 1 - col;
    }

    const columnSpan = Math.max(columns - 1, 1);
    const rowSpan = Math.max(rows - 1, 1);
    const baseX = columns === 1 ? 0.5 : col / columnSpan;
    const baseY = rows === 1 ? 0.5 : row / rowSpan;

    const cellWidth = 1 / columns;
    const cellHeight = 1 / rows;
    const jitterX = (Math.random() - 0.5) * cellWidth * jitterScale;
    const jitterY = (Math.random() - 0.5) * cellHeight * jitterScale;

    const normalizedX = Math.min(Math.max(baseX + jitterX, 0), 1);
    const normalizedY = Math.min(Math.max(baseY + jitterY, 0), 1);

    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const minX = marginX + halfWidth;
    const maxX = viewportWidth - marginX - halfWidth;
    const minY = marginY + halfHeight;
    const maxY = viewportHeight - marginY - halfHeight;

    const resolvedX = minX <= maxX
      ? minX + normalizedX * (maxX - minX)
      : viewportWidth / 2;
    const resolvedY = minY <= maxY
      ? minY + normalizedY * (maxY - minY)
      : viewportHeight / 2;

    return { x: resolvedX, y: resolvedY };
  };
};

export function setupWhatPhysics() {
  // --- Step 1: Initialization and Variable Scoping ---
  const engine = initializeMatterEngine();
  const world = engine.world;

  // Store cleanup functions. Initialize them to no-op functions.
  let cleanupDeviceGravityListener = () => {};
  let cleanupSyncLoop = () => {};
  let cleanupResizeHandler = () => {}; // For the return of handleResize
  let cleanupDragging = () => {};

  const bodies = []; // To track all Matter bodies and their DOM elements
  let lastTitleColor = null;

  // --- Step 2: Gravity Setup ---
  function randomGravity() {
    return {
      x: (Math.random() - 0.5) * 0.3,
      y: (Math.random() - 0.5) * 0.3
    };
  }

  if (isMobile()) {
    // Store the returned cleanup function from enableDeviceGravity
    cleanupDeviceGravityListener = enableDeviceGravity(engine);
  } else {
    const initialGravity = randomGravity();
    setGravity(engine, initialGravity.x, initialGravity.y);
  }

  // --- Step 3: Boundaries and Resize Handling ---
  const boundaries = createViewportBoundaries(world);
  // Store the returned cleanup function from handleResize
  cleanupResizeHandler = handleResize(boundaries, world);

  // --- Step 4: DOM Container Setup ---
  const container = document.createElement('div');
  container.id = 'container';
  container.classList.add('container');
  container.style.touchAction = 'none'; // Crucial for custom pointer/touch handling
  container.style.cursor = `url('${import.meta.env.BASE_URL}cursors/just-click.svg') 32 32, auto`;
  container.__navMenuCleanup = [];
  document.body.appendChild(container);

  // --- Step 5: Project Data and State ---
  const projects = projectsData.projects;
  const summaryPrefetched = new Set();
  const preloadSummary = (index) => {
    if (!summaryPrefetched.has(index)) {
      summaryPrefetched.add(index);
      const fn = () => prefetchSummaryAssets(projects[index].summary);
      if (window.requestIdleCallback) {
        requestIdleCallback(fn);
      } else {
        setTimeout(fn, 50 * index);
      }
    }
  };
  preloadSummary(0);
  let currentProjectIndex = 0;
  let currentElementIndex = 0;
  let holdButtonDom = null;
  const preloadedIndices = new Set();
  let spawnInProgress = false;

  const waitForSpawnIdle = () => new Promise((resolve) => {
    const check = () => {
      if (!spawnInProgress) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  });

  function updateWhitespaceCursor() {
    const summaryElements = projects[currentProjectIndex].summary.elements;
    if (currentElementIndex < summaryElements.length) {
      container.style.cursor = `url('${import.meta.env.BASE_URL}cursors/just-click.svg') 32 32, auto`;
    } else {
      container.style.cursor = `url('${import.meta.env.BASE_URL}cursors/next.svg') 32 32, auto`;
    }
  }

  const amIMobile = isMobile(); // Determine device type once

  // --- Step 6: Initial Project Title ---
  let { body: titleBody, domElement: titleDom } = spawnCenterText(
    world,
    container,
    projects[currentProjectIndex].title,
    { tag: 'h1', className: 'whatpage-title' }
  );
  bodies.push({ body: titleBody, domElement: titleDom });

  // --- Title interaction: block spawning on title tap/click and show hint ---
  let titleHintTimeout = null;
  function showTitleHint() {
    const id = 'title-click-hint';
    let hint = document.getElementById(id);
    if (!hint) {
      hint = document.createElement('div');
      hint.id = id;
      hint.textContent = amIMobile
        ? "dont tap the title but the white space..."
        : "dont click the title but the white space...";
      container.appendChild(hint);
      // Force reflow to enable fade-in transition
      // eslint-disable-next-line no-unused-expressions
      hint.offsetHeight;
    }
    hint.style.opacity = '1';
    if (titleHintTimeout) clearTimeout(titleHintTimeout);
    titleHintTimeout = setTimeout(() => {
      if (hint) hint.style.opacity = '0';
      // Remove after fade
      setTimeout(() => {
        if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      }, 150);
    }, 3000);
  }

  function attachTitleInterception(dom) {
    if (!dom) return;
    const stop = (e) => { e.stopPropagation(); e.preventDefault(); };
    // Block pointer events from bubbling to container listeners
    dom.addEventListener('pointerdown', stop);
    dom.addEventListener('pointerup', (e) => { stop(e); showTitleHint(); });
    dom.addEventListener('click', (e) => { stop(e); showTitleHint(); });
    dom.style.touchAction = 'none';
  }
  attachTitleInterception(titleDom);

  const completionJitter = () => (Math.random() * 40) - 20;

  async function addCompletionElements(baseX, baseY) {
    const x = typeof baseX === 'number' ? baseX : window.innerWidth / 2;
    const y = typeof baseY === 'number' ? baseY : window.innerHeight / 2;

    const fullData = {
      type: 'button',
      content: 'view full project',
      cssClass: 'view-full-project-button',
      action: 'openFullProject'
    };
    await addProjectElement(fullData, x + completionJitter(), y + completionJitter());

    if (amIMobile) {
      const holdData = {
        type: 'button',
        content: 'hold for next',
        cssClass: 'hold-next-button'
      };
      const { domElement } = await addProjectElement(
        holdData,
        x + completionJitter(),
        y + completionJitter()
      );
      holdButtonDom = domElement;
    } else {
      holdButtonDom = null;
    }

    const color = pickRandomPrimary([lastTitleColor]);
    titleDom.dataset.highlightColor = color;
    markDone(titleDom);
    lastTitleColor = color;
  }

  if (!preloadedIndices.has(currentProjectIndex)) {
    preloadedIndices.add(currentProjectIndex);
    prefetchProjectAssets(projects[currentProjectIndex].details);
  }
  // Prefetch the next project's summary to keep one step ahead
  const nextSummaryIndex = (currentProjectIndex + 1) % projects.length;
  preloadSummary(nextSummaryIndex);

  updateWhitespaceCursor();

  // Position the title: center on desktop, lower on mobile
  Matter.Body.setPosition(
    titleBody,
    { x: window.innerWidth / 2, y: amIMobile ? window.innerHeight * 0.9 : window.innerHeight / 2 }
  );

  async function addProjectElement(elementData, spawnX, spawnY, placementCallback) {
    let domElement, measuredWidth, measuredHeight;
    let ro; // ResizeObserver for text elements, if created
    
    // Determine current scale based on device
    const scaling = amIMobile ? getMobileScaling() : DESKTOP_SCALING;
    const currentImageScale = scaling.image;
    const currentVideoScale = scaling.video;
    const currentTextBodyScale = scaling.text;
    const currentButtonBodyScale = scaling.button;

    if (elementData.type === 'image') {
      // Use currentImageScale when loading/measuring
      const data = await loadAndMeasureImage(
        elementData.src,
        container,
        currentImageScale,
        elementData.alt
      );
      domElement = data.element;
      measuredWidth = data.width;
      measuredHeight = data.height;
      domElement.classList.add('project-image');
    } else if (elementData.type === 'video') {
      // Use currentVideoScale
      const data = await loadAndMeasureVideo(elementData.src, container, currentVideoScale);
      domElement = data.element;
      measuredWidth = data.width;
      measuredHeight = data.height;
      domElement.classList.add('project-video');
/* ── TEXT ELEMENTS ─────────────────────────────────────────── */
} else if (elementData.type === 'text') {
  // 1 ▸ decide CSS classes
  const cssClasses = (() => {
    switch (elementData.class) {
      case 'description': {
        const arr = ['description-text'];
        if (elementData.size) arr.push(`summary-${elementData.size}`);
        return arr;
      }
      case 'details':       return ['details-text'];
      case 'credits':       return ['credits-text'];
      case 'archive-title': return ['archive-title'];
      default:              return ['project-text'];
    }
  })();
  const summaryText = elementData.content.split('. ')[0];

  // Measure after fonts load so physics body matches final text size.
  // Passing { wrap: true } ensures the text wraps exactly like in the page.
const { width: rawW, height: rawH } = await measureTextDimensionsAfterFonts(
  summaryText,
  cssClasses
);

  measuredWidth  = rawW * currentTextBodyScale; // currentTextBodyScale is likely 1.0
  measuredHeight = rawH * currentTextBodyScale;

  domElement = document.createElement('div');
  domElement.innerHTML = summaryText.replace(/\n/g, '<br>');
  domElement.classList.add(...cssClasses); // Applies display:block, width:fit-content, etc.
  domElement.dataset.scale = currentTextBodyScale;
  container.appendChild(domElement);

  // ... (ResizeObserver logic, which should still work fine) ...
  // Inside addProjectElement, when creating the ResizeObserver for text elements
    ro = new ResizeObserver(([e]) => {
  // Ensure body is still valid and part of the Matter world
  if (body && world.bodies.includes(body)) {
      const currentBodyWidth = body.bounds.max.x - body.bounds.min.x;
      const currentBodyHeight = body.bounds.max.y - body.bounds.min.y;

      const newDomWidth = e.contentRect.width * currentTextBodyScale;
      const newDomHeight = e.contentRect.height * currentTextBodyScale;

      // Check for positive dimensions to avoid division by zero or NaN scales
      if (currentBodyWidth > 0 && currentBodyHeight > 0 && newDomWidth > 0 && newDomHeight > 0) {
          const scaleX = newDomWidth / currentBodyWidth;
          const scaleY = newDomHeight / currentBodyHeight;

          // Apply scaling only if there's a noticeable difference (e.g., > 1%)
          // This helps prevent jitter from tiny floating point differences.
          if (Math.abs(scaleX - 1) > 0.01 || Math.abs(scaleY - 1) > 0.01) {
               Matter.Body.scale(body, scaleX, scaleY);
               // Re-set inertia after scaling to prevent odd rotations if density changes drastically
               Matter.Body.setInertia(body, Matter.Body.getInertia(body));
          }
            }
        } else {
            // If body is no longer valid (e.g., removed from world), unobserve
            ro.unobserve(e.target); // e.target is the domElement
        }
      });
      ro.observe(domElement);

      } else if (elementData.type === 'button') {
        domElement = document.createElement('button');
        domElement.textContent = elementData.content;
        const btnClass = elementData.cssClass || 'view-full-project-button';
        domElement.classList.add(btnClass);
        if (elementData.action === 'openFullProject') {
          domElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openFullProjectModal(projects[currentProjectIndex].details);
          });
        } else {
          domElement.addEventListener('click', (e) => e.stopPropagation());
        }
        container.appendChild(domElement);
        const rect = domElement.getBoundingClientRect();
        measuredWidth = rect.width || 100; // Fallback
        measuredHeight = rect.height || 30; // Fallback

        // Increase body size to include box-shadow offsets/spread so
        // collisions match the button's visible extent.
        const style = window.getComputedStyle(domElement);
        const firstShadow = style.boxShadow ? style.boxShadow.split(',')[0] : '';
        const nums = firstShadow.match(/-?\d*\.?\d+px/g) || [];
        const offsetX = parseFloat(nums[0]) || 0;
        const offsetY = parseFloat(nums[1]) || 0;
        const spread = parseFloat(nums[3]) || 0; // third index = spread if present
        measuredWidth += Math.abs(offsetX) + Math.abs(spread);
        measuredHeight += Math.abs(offsetY) + Math.abs(spread);

        // Scale the physics body dimensions for button
        measuredWidth *= currentButtonBodyScale;
        measuredHeight *= currentButtonBodyScale;
        domElement.dataset.scale = currentButtonBodyScale;
    } else {
      domElement = document.createElement('div');
      domElement.textContent = 'Unknown element type';
      domElement.classList.add('project-unknown');
      measuredWidth = elementData.width || 100; // Fallback
      measuredHeight = elementData.height || 30; // Fallback
      // Apply a generic mobile scale if desired for unknown types too
      const genericScale = amIMobile ? 0.6 : 1.0;
      measuredWidth = (elementData.width || 100) * genericScale;
      measuredHeight = (elementData.height || 30) * genericScale;
      container.appendChild(domElement);
    }
    
    domElement.classList.add('project-element');
    domElement.style.position = 'absolute';
    domElement.style.userSelect = 'none';
    domElement.setAttribute('draggable', 'false');

    const bodyWidth = measuredWidth > 0 ? measuredWidth : 50;
    const bodyHeight = measuredHeight > 0 ? measuredHeight : 20;

    let resolvedX = spawnX;
    let resolvedY = spawnY;
    const usingPlanner = typeof placementCallback === 'function';

    if (usingPlanner) {
      try {
        const plannedPosition = placementCallback({ width: bodyWidth, height: bodyHeight });
        if (plannedPosition && Number.isFinite(plannedPosition.x) && Number.isFinite(plannedPosition.y)) {
          resolvedX = plannedPosition.x;
          resolvedY = plannedPosition.y;
        }
      } catch (error) {
        console.error('Failed to resolve auto-spawn position', error);
      }
    }

    if (usingPlanner) {
      const { marginX, marginY } = computeViewportMargins(window.innerWidth, window.innerHeight);
      const minX = marginX + bodyWidth / 2;
      const maxX = window.innerWidth - marginX - bodyWidth / 2;
      const minY = marginY + bodyHeight / 2;
      const maxY = window.innerHeight - marginY - bodyHeight / 2;

      if (!Number.isFinite(resolvedX)) {
        resolvedX = minX <= maxX
          ? minX + Math.random() * (maxX - minX)
          : window.innerWidth / 2;
      }
      if (!Number.isFinite(resolvedY)) {
        resolvedY = minY <= maxY
          ? minY + Math.random() * (maxY - minY)
          : window.innerHeight / 2;
      }

      resolvedX = clampValue(resolvedX, minX, maxX);
      resolvedY = clampValue(resolvedY, minY, maxY);
    } else {
      if (!Number.isFinite(resolvedX)) {
        resolvedX = Math.random() * window.innerWidth;
      }
      if (!Number.isFinite(resolvedY)) {
        resolvedY = Math.random() * window.innerHeight;
      }
    }

    const body = Matter.Bodies.rectangle(
      resolvedX,
      resolvedY,
      bodyWidth,
      bodyHeight,
      { restitution: 0.9, friction: 0.05 }
    );
    Matter.World.add(world, body);
    const item = { body, domElement };
    if (ro) item.ro = ro;
    bodies.push(item);
    return item;
  }

  // --- Step 8: `clearProjectElements` Function ---
  function clearProjectElements() {
    for (let i = bodies.length - 1; i >= 0; i--) {
      const item = bodies[i];
      if (item.body !== titleBody &&
          !(item.domElement.classList && item.domElement.classList.contains('nav-button')) &&
          !(item.domElement.classList && item.domElement.classList.contains('what-nav-button'))
      ) {
        // Disconnect ResizeObserver if it exists
        if (item.ro && typeof item.ro.disconnect === 'function') {
          item.ro.disconnect();
        }

        Matter.World.remove(world, item.body);
        if (item.domElement.parentNode) {
          item.domElement.parentNode.removeChild(item.domElement);
        }
        bodies.splice(i, 1);
      }
    }
  }

  // --- Step 9: General Navigation Menu ---
  const navMenuBodies = createPhysicsNavMenu(world, container, '/what');
  bodies.push(...navMenuBodies);
  window.dispatchEvent(new CustomEvent('whatProjectChanged', {
    detail: { index: currentProjectIndex }
  }));

  // --- Step 10: Pointer Event Handling for Spawning ---
  let pointerDownPos = null;
  let isDragging = false;
  const DRAG_THRESHOLD = 5;
  const LONG_PRESS_DURATION = 400;
  let longPressTimer = null;
  let longPressFired = false;

  // Define handlers as constants to ensure correct removal
  const handlePointerDown = (e) => {
    if (!e.isPrimary) return;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    isDragging = false;

    if (
      amIMobile &&
      currentElementIndex >= projects[currentProjectIndex].summary.elements.length &&
      !(e.target.classList.contains('view-full-project-button') ||
        e.target.classList.contains('hold-next-button') ||
        e.target.closest('.nav-button') ||
        e.target.closest('.what-nav-button') ||
        e.target.closest('.project-dropdown'))
    ) {
      longPressFired = false;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        handleProjectNavigation((currentProjectIndex + 1) % projects.length);
        longPressTimer = null;
      }, LONG_PRESS_DURATION);
      if (holdButtonDom) {
        const color = titleDom.dataset.highlightColor || '#000';
        holdButtonDom.style.setProperty('--hold-color', color);
        holdButtonDom.style.setProperty('--hold-progress', '100%');
      }
    }
  };

  const handlePointerMove = (e) => {
    if (!e.isPrimary || !pointerDownPos) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      isDragging = true;
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
        if (holdButtonDom) {
          holdButtonDom.style.setProperty('--hold-progress', '0%');
        }
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!e.isPrimary) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
      if (holdButtonDom) {
        holdButtonDom.style.setProperty('--hold-progress', '0%');
      }
      pointerDownPos = null;
      return;
    }
    if (longPressFired) {
      longPressFired = false;
      if (holdButtonDom) {
        holdButtonDom.style.setProperty('--hold-progress', '0%');
      }
      pointerDownPos = null;
      return;
    }

    if (isDragging) {
      isDragging = false;
      pointerDownPos = null;
      if (holdButtonDom) {
        holdButtonDom.style.setProperty('--hold-progress', '0%');
      }
      return;
    }

    // Check if the tap was on the container itself or a non-interactive child
    if (e.target === container || container.contains(e.target)) {
      // If the tap was on the title, block spawn and show hint
      if (e.target.closest && e.target.closest('.whatpage-title')) {
        showTitleHint();
        pointerDownPos = null;
        return;
      }
      // Prevent spawning if a button with its own interaction was clicked/tapped
        if (e.target.classList.contains('view-full-project-button') ||
            e.target.classList.contains('hold-next-button') ||
            e.target.closest('.nav-button') || // General nav
            e.target.closest('.what-nav-button') ||
            e.target.closest('.project-dropdown')) { // Project-specific nav (whatNav.js) or dropdown list
        pointerDownPos = null; // Reset, but let the button's own click handler fire
        return;
      }
      handleClickToSpawn(e); // Proceed to spawn
    }
    pointerDownPos = null; // Reset after any interaction
    if (holdButtonDom) {
      holdButtonDom.style.setProperty('--hold-progress', '0%');
    }
  };

  const handlePointerCancel = (e) => {
    if (!e.isPrimary) return;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    longPressFired = false;
    if (holdButtonDom) {
      holdButtonDom.style.setProperty('--hold-progress', '0%');
    }
    pointerDownPos = null;
    isDragging = false;
  };

  // Attach pointer event listeners
  container.addEventListener('pointerdown', handlePointerDown);
  container.addEventListener('pointermove', handlePointerMove);
  container.addEventListener('pointerup', handlePointerUp);
  container.addEventListener('pointercancel', handlePointerCancel);

  // --- Step 11: `handleClickToSpawn` Function (Triggered by PointerUp) ---
  async function handleClickToSpawn(event) {
    if (isDragging || spawnInProgress) return; // Should already be handled by pointerup, but as a safeguard
    spawnInProgress = true;
    try {

    const x = event.clientX;
    const y = event.clientY;

    const currentProject = projects[currentProjectIndex];
    const summaryElements = currentProject.summary.elements;

    if (currentElementIndex < summaryElements.length) {
      const elementData = summaryElements[currentElementIndex];
      await addProjectElement(elementData, x, y);
      currentElementIndex++;
      updateWhitespaceCursor();
      if (currentElementIndex === summaryElements.length) {
        await addCompletionElements(x, y);
      }
    } else {
      if (!amIMobile) {
        handleProjectNavigation((currentProjectIndex + 1) % projects.length);
      }
    }
    } finally {
      spawnInProgress = false;
    }
  }

  // --- Step 12: Project-Specific Navigation (Bottom Nav) ---
  let specificNavButtonObjects = createWhatProjectNav(world, container, currentProjectIndex, projects.length);
  bodies.push(...specificNavButtonObjects);

  function updateSpecificNav() {
    // Remove old specific nav buttons from Matter world, DOM, and the `bodies` array
    specificNavButtonObjects.forEach(({ body, domElement }) => {
      Matter.World.remove(world, body);
      if (domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }
      const indexInBodies = bodies.findIndex(b => b.body === body);
      if (indexInBodies > -1) {
        bodies.splice(indexInBodies, 1);
      }
    });
    
    // Create and add new ones
    specificNavButtonObjects = createWhatProjectNav(world, container, currentProjectIndex, projects.length);
    bodies.push(...specificNavButtonObjects);
  }

  // --- Step 13: Custom Event Listener for Project Navigation ---
  function handleProjectNavigation(newIndex) {
    currentProjectIndex = newIndex;
    currentElementIndex = 0;
    clearProjectElements();
    holdButtonDom = null;
    updateWhitespaceCursor();

    if (!preloadedIndices.has(currentProjectIndex)) {
      preloadedIndices.add(currentProjectIndex);
      prefetchProjectAssets(projects[currentProjectIndex].details);
    }
    preloadSummary(currentProjectIndex);

    // Preload the next project's summary and details
    const nextIndex = (currentProjectIndex + 1) % projects.length;
    preloadSummary(nextIndex);
    if (!preloadedIndices.has(nextIndex)) {
      preloadedIndices.add(nextIndex);
      prefetchProjectAssets(projects[nextIndex].details);
    }

    // Remove old title
    Matter.World.remove(world, titleBody);
    if (titleDom.parentNode) titleDom.parentNode.removeChild(titleDom);
    const titleIndexInBodies = bodies.findIndex(b => b.body === titleBody);
    if (titleIndexInBodies > -1) bodies.splice(titleIndexInBodies, 1);


    // Create new title
    const newTitleData = spawnCenterText(
      world,
      container,
      projects[currentProjectIndex].title,
      { tag: 'h1', className: 'whatpage-title' }
    );
    titleBody = newTitleData.body;
    titleDom = newTitleData.domElement;
    bodies.push({ body: titleBody, domElement: titleDom });
    attachTitleInterception(titleDom);
    Matter.Body.setPosition(
      titleBody,
      { x: window.innerWidth / 2, y: amIMobile ? window.innerHeight * 0.9 : window.innerHeight / 2 }
    );
    
    if (!isMobile()) {
        const newGravity = randomGravity();
        setGravity(engine, newGravity.x, newGravity.y);
    }
    updateSpecificNav();
    window.dispatchEvent(new CustomEvent('whatProjectChanged', {
      detail: { index: currentProjectIndex }
    }));
  }

  async function completeProjectInstantly(targetIndex) {
    await waitForSpawnIdle();
    spawnInProgress = true;
    try {
      handleProjectNavigation(targetIndex);

      const summaryElements = projects[currentProjectIndex].summary.elements;
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const placementPlanner = createScatterPlanner(
        summaryElements.length,
        window.innerWidth,
        window.innerHeight
      );

      for (const elementData of summaryElements) {
        await addProjectElement(
          elementData,
          undefined,
          undefined,
          placementPlanner
        );
      }

      currentElementIndex = summaryElements.length;
      updateWhitespaceCursor();

      await addCompletionElements(centerX, centerY);
    } finally {
      spawnInProgress = false;
    }
  }

  // Define the handler for the custom event
  const handleWhatProjectNavEvent = (e) => {
    const { target } = e.detail;
    let newIndex = currentProjectIndex;
    if (target === 'previous') {
      newIndex = (currentProjectIndex - 1 + projects.length) % projects.length;
    } else if (target === 'next') {
      newIndex = (currentProjectIndex + 1) % projects.length;
    } else if (typeof target === 'number' && target >= 0 && target < projects.length) {
        newIndex = target;
    }
    if (newIndex !== currentProjectIndex) { // Only navigate if index actually changes
        handleProjectNavigation(newIndex);
    }
  };
  window.addEventListener('whatProjectNav', handleWhatProjectNavEvent);

  const handleProjectListSelect = async (event) => {
    const { index } = event.detail || {};
    if (typeof index !== 'number' || index < 0 || index >= projects.length) {
      return;
    }
    try {
      await completeProjectInstantly(index);
    } catch (error) {
      console.error('Failed to complete project from list button', error);
    }
  };
  window.addEventListener('whatProjectListSelect', handleProjectListSelect);

  // --- Step 14: Start DOM Syncing, Dragging, and Matter.js Runner ---
  // Store the returned cleanup function from syncDOMWithBodies
  cleanupSyncLoop = syncDOMWithBodies(bodies, container);

  cleanupDragging = enableDragging(engine, world, container);

  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  
/* === DEBUG RENDERER (wire-frame overlay) ===================== */
const DEBUG = false;   // flip to false in production

let debugRender = null;
let debugResizeHandler = null;

if (DEBUG) {
  debugRender = Matter.Render.create({
    element: container,          // overlays inside same div
    engine:  engine,
    options: {
      width:        window.innerWidth,
      height:       window.innerHeight,
      wireframes:   true,        // <-- outlines only
      background:   'transparent',
      pixelRatio:   window.devicePixelRatio,
    },
  });
  Matter.Render.run(debugRender);

  // keep canvas size in sync on resize
  debugResizeHandler = () => {
    debugRender.canvas.width  = window.innerWidth;
    debugRender.canvas.height = window.innerHeight;
    debugRender.options.width  = window.innerWidth;
    debugRender.options.height = window.innerHeight;
  };
  window.addEventListener('resize', debugResizeHandler);
}
/* ============================================================= */

  // --- Step 15: Teardown Function ---
  return function teardownWhatPhysics() {
    // console.log('Tearing down WhatPhysics...');

    // A. Remove event listeners
    container.removeEventListener('pointerdown', handlePointerDown);
    container.removeEventListener('pointermove', handlePointerMove);
    container.removeEventListener('pointerup', handlePointerUp);
    container.removeEventListener('pointercancel', handlePointerCancel);
    window.removeEventListener('whatProjectNav', handleWhatProjectNavEvent);
    window.removeEventListener('whatProjectListSelect', handleProjectListSelect);
    // console.log('Custom and pointer listeners removed.');

    if (Array.isArray(container.__navMenuCleanup)) {
      container.__navMenuCleanup.forEach((fn) => {
        try {
          fn();
        } catch (error) {
          // ignore cleanup errors
        }
      });
      container.__navMenuCleanup.length = 0;
      container.__navMenuCleanup = null;
    }

    // B. Call cleanup functions for ongoing processes
    if (cleanupSyncLoop) {
      cleanupSyncLoop();
      // console.log('DOM sync loop stopped.');
    }
    if (cleanupDeviceGravityListener) {
      cleanupDeviceGravityListener();
      // console.log('Device gravity listener stopped.');
    }
    if (cleanupResizeHandler) {
      cleanupResizeHandler();
      // console.log('Resize handler stopped.');
    }
    if (cleanupDragging) {
      cleanupDragging();
    }

    // C. Stop Matter.js
    Matter.Runner.stop(runner);
    // console.log('Matter Runner stopped.');

    // Clear all bodies from the Matter world and DOM *before* clearing the world/engine
    // This also helps if syncDOMWithBodies tries one last frame.
    bodies.forEach(item => {
      if (item.body && world.bodies.includes(item.body)) { // Check if body is still in world
         Matter.World.remove(world, item.body, true); // true for deep removal if it's a composite
      }
      if (item.domElement && item.domElement.parentNode) {
        item.domElement.parentNode.removeChild(item.domElement);
      }
    });
    bodies.length = 0; // Empty the tracking array

    Matter.World.clear(world, false); // false: don't clear child composites recursively if already handled
    // console.log('Matter World cleared.');
    Matter.Engine.clear(engine);
    // console.log('Matter Engine cleared.');

    // D. Remove the main container from the DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
      // console.log('Physics container removed from DOM.');
    }
    // console.log('WhatPhysics teardown complete.');
  };
}
