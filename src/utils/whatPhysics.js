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
  loadAndMeasureVideo
} from './generalUtils.js';
import { createPhysicsNavMenu, pickRandomPrimary } from './navButtons.js';
import { createWhatProjectNav } from './whatNav.js'; // Ensure class name 'what-nav-button' is used by this
import { openFullProjectModal } from './fullProjectModal.js';
import { markDone } from './doneColor.js';

const MOBILE_SCALING = {
  image: 0.45, // e.g., images are 45% of their desktop summary size on mobile
  video: 0.1,  // Videos might need more aggressive scaling due to their original size
  text: 1.0,   // Text physics bodies might be 80% of desktop, actual font via CSS
  button: 0.8, // Button physics bodies
  // Add more types if needed
};

const DESKTOP_SCALING = { // Original scales you were using
  image: 0.75,
  video: 0.15,
  text: 1.0,    // Assuming no explicit scaling for text/button bodies before
  button: 1.0,
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
  document.body.appendChild(container);

  // --- Step 5: Project Data and State ---
  const projects = projectsData.projects;
  let currentProjectIndex = 0;
  let currentElementIndex = 0;

  const amIMobile = isMobile(); // Determine device type once

  // --- Step 6: Initial Project Title ---
  let { body: titleBody, domElement: titleDom } = spawnCenterText(
    world,
    container,
    projects[currentProjectIndex].title,
    { tag: 'h1', className: 'whatpage-title' }
  );
  bodies.push({ body: titleBody, domElement: titleDom });

  // Position the title: center on desktop, lower on mobile
  Matter.Body.setPosition(
    titleBody,
    { x: window.innerWidth / 2, y: amIMobile ? window.innerHeight * 0.9 : window.innerHeight / 2 }
  );

  async function addProjectElement(elementData, spawnX, spawnY) {
    let domElement, measuredWidth, measuredHeight;
    let ro; // ResizeObserver for text elements, if created
    
    // Determine current scale based on device
    const currentImageScale = amIMobile ? MOBILE_SCALING.image : DESKTOP_SCALING.image;
    const currentVideoScale = amIMobile ? MOBILE_SCALING.video : DESKTOP_SCALING.video;
    // For text and buttons, we might primarily control visual size with CSS,
    // but we can scale the physics body if desired.
    const currentTextBodyScale = amIMobile ? MOBILE_SCALING.text : DESKTOP_SCALING.text;
    const currentButtonBodyScale = amIMobile ? MOBILE_SCALING.button : DESKTOP_SCALING.button;

    if (elementData.type === 'image') {
      // Use currentImageScale when loading/measuring
      const data = await loadAndMeasureImage(elementData.src, container, currentImageScale);
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
  // domElement.style.display = 'inline-table'; // REMOVE this if you were experimenting
  // domElement.style.display = 'inline-block'; // REMOVE this
  container.appendChild(domElement);

  // ... (ResizeObserver logic, which should still work fine) ...
  // Inside addProjectElement, when creating the ResizeObserver for text elements
    ro = new ResizeObserver(([e]) => {
  // Ensure body is still valid and part of the Matter world
  if (body && world.bodies.includes(body)) {
      const currentBodyWidth = body.bounds.max.x - body.bounds.min.x;
      const currentBodyHeight = body.bounds.max.y - body.bounds.min.y;

      const newDomWidth = e.contentRect.width;
      const newDomHeight = e.contentRect.height;

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
      domElement.classList.add('view-full-project-button');
      domElement.addEventListener('click', (e) => {
        e.stopPropagation();
        openFullProjectModal(projects[currentProjectIndex].details);
      });
      container.appendChild(domElement);
      const rect = domElement.getBoundingClientRect();
      measuredWidth = rect.width || 100; // Fallback
      measuredHeight = rect.height || 30; // Fallback
      // Scale the physics body dimensions for button
      measuredWidth *= currentButtonBodyScale;
      measuredHeight *= currentButtonBodyScale;
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
    
    // Re-measure DOM element for visual reference if needed, but physics body uses scaled values
    // const finalRect = domElement.getBoundingClientRect();
    // Note: measuredWidth and measuredHeight are now the SIZED values for the physics body

    const body = Matter.Bodies.rectangle(
      (typeof spawnX === 'number') ? spawnX : Math.random() * window.innerWidth,
      (typeof spawnY === 'number') ? spawnY : Math.random() * window.innerHeight,
      measuredWidth > 0 ? measuredWidth : 50,
      measuredHeight > 0 ? measuredHeight : 20,
      { restitution: 0.9, friction: 0.05 }
    );
    Matter.World.add(world, body);
    const item = { body, domElement };
    if (ro) item.ro = ro;
    bodies.push(item);
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

  // --- Step 10: Pointer Event Handling for Spawning ---
  let pointerDownPos = null;
  let isDragging = false;
  const DRAG_THRESHOLD = 5;

  // Define handlers as constants to ensure correct removal
  const handlePointerDown = (e) => {
    if (!e.isPrimary) return;
    pointerDownPos = { x: e.clientX, y: e.clientY };
    isDragging = false;
  };

  const handlePointerMove = (e) => {
    if (!e.isPrimary || !pointerDownPos) return;
    const dx = e.clientX - pointerDownPos.x;
    const dy = e.clientY - pointerDownPos.y;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
      isDragging = true;
    }
  };

  const handlePointerUp = (e) => {
    if (!e.isPrimary) return;

    if (isDragging) {
      isDragging = false;
      pointerDownPos = null;
      return;
    }

    // Check if the tap was on the container itself or a non-interactive child
    if (e.target === container || container.contains(e.target)) {
      // Prevent spawning if a button with its own interaction was clicked/tapped
      if (e.target.classList.contains('view-full-project-button') ||
          e.target.closest('.nav-button') || // General nav
          e.target.closest('.what-nav-button')) { // Project-specific nav (ensure this class is used in whatNav.js)
        pointerDownPos = null; // Reset, but let the button's own click handler fire
        return;
      }
      handleClickToSpawn(e); // Proceed to spawn
    }
    pointerDownPos = null; // Reset after any interaction
  };

  const handlePointerCancel = (e) => {
    if (!e.isPrimary) return;
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
    if (isDragging) return; // Should already be handled by pointerup, but as a safeguard

    const x = event.clientX;
    const y = event.clientY;

    const currentProject = projects[currentProjectIndex];
    const summaryElements = currentProject.summary.elements;

    if (currentElementIndex < summaryElements.length) {
      const elementData = summaryElements[currentElementIndex];
      await addProjectElement(elementData, x, y);
      currentElementIndex++;
      if (currentElementIndex === summaryElements.length) {
        const buttonData = { type: 'button', content: 'View Full Project' };
        await addProjectElement(buttonData, x + (Math.random()*40-20), y + (Math.random()*40-20)); // Slight offset
        const color = pickRandomPrimary([lastTitleColor]);
        titleDom.dataset.highlightColor = color;
        markDone(titleDom);
        lastTitleColor = color;
      }
    } else {
      // Advance to the next project
      currentProjectIndex = (currentProjectIndex + 1) % projects.length;
      currentElementIndex = 0;
      clearProjectElements(); // Clears only summary items, not title/nav

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
      Matter.Body.setPosition(
        titleBody,
        { x: window.innerWidth / 2, y: amIMobile ? window.innerHeight * .9 : window.innerHeight / 2 }
      );

      if (!isMobile()) { // Only change gravity on desktop, mobile uses device orientation
        const newGravity = randomGravity();
        setGravity(engine, newGravity.x, newGravity.y);
      }
      
      updateSpecificNav();
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
    Matter.Body.setPosition(
      titleBody,
      { x: window.innerWidth / 2, y: amIMobile ? window.innerHeight * 0.9 : window.innerHeight / 2 }
    );
    
    if (!isMobile()) {
        const newGravity = randomGravity();
        setGravity(engine, newGravity.x, newGravity.y);
    }
    updateSpecificNav();
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
    // console.log('Custom and pointer listeners removed.');

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