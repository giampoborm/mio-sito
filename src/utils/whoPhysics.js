// src/utils/whoPhysics.js

import Matter from 'matter-js';
import {
  initializeMatterEngine,
  createViewportBoundaries,
  syncDOMWithBodies,
  enableDragging,
  setGravity,
  handleResize,
  enableDeviceGravity,
  isMobile
} from './physicsSetup.js';
import { loadAndMeasureImage } from './generalUtils.js';
import { createPhysicsNavMenu } from './navButtons.js';
import { ANCHORS } from '../data/who_text.js';

// --- Ragdoll asset imports ---
import headPath from '../assets/who/head.png';
import torsoPath from '../assets/who/torso.png';
import leftUpperArmPath from '../assets/who/leftUpperArm.png';
import leftLowerArmPath from '../assets/who/leftLowerArm.png';
import rightUpperArmPath from '../assets/who/rightUpperArm.png';
import rightLowerArmPath from '../assets/who/rightLowerArm.png';
import leftUpperLegPath from '../assets/who/leftUpperLeg.png';
import leftLowerLegPath from '../assets/who/leftLowerLeg.png';
import rightUpperLegPath from '../assets/who/rightUpperLeg.png';
import rightLowerLegPath from '../assets/who/rightLowerLeg.png';

// --- Helper: Get anchor position (fractional, supports dx/dy pixel nudge) ---
function getAnchorPosition(anchor, isOnMobile) {
  const mode = isOnMobile ? "mobile" : "desktop";
  const pos = anchor.position[mode];
  const dx = pos && "dx" in pos ? pos.dx : 0;
  const dy = pos && "dy" in pos ? pos.dy : 0;
  return {
    x: Math.round((pos.x || 0) * window.innerWidth + dx),
    y: Math.round((pos.y || 0) * window.innerHeight + dy),
  };
}

// --- Microtext spawner ---
function spawnMicroText(world, container, bodies, micro, event, idx = 0) {
  let el;
  if (micro.link) {
    el = document.createElement('a');
    el.href = micro.link;
    el.textContent = micro.text;
    el.target = "_blank";
    el.className = "microtext link";
  } else {
    el = document.createElement('div');
    el.textContent = micro.text;
    el.className = "microtext";
  }
  if (micro.class) el.classList.add(micro.class);

  el.style.position = 'absolute';
  container.appendChild(el);

  // Measure for width/height ONLY
  const rect = el.getBoundingClientRect();

  // Get mouse coords relative to container
  const containerRect = container.getBoundingClientRect();
  const spawnX = event.clientX - containerRect.left;
  const spawnY = event.clientY - containerRect.top + idx * 36;

  // Create Matter.js body at desired spawnX/Y and with measured size
  const body = Matter.Bodies.rectangle(
    spawnX,
    spawnY,
    rect.width,
    rect.height,
    { restitution: 0.9 }
  );
  Matter.World.add(world, body);
  bodies.push({ body, domElement: el });
}

// --- Easter egg spawner ---
function spawnEasterEgg(world, container, bodies) {
  const el = document.createElement('div');
  el.textContent = "congrats, you've unleashed maximal chaos. this is why i don't do awards.";
  el.className = "easter-egg";
  container.appendChild(el);
  // Spawn in the center, let it fall dramatically
  const x = window.innerWidth / 2;
  const y = -80;
  const rect = el.getBoundingClientRect();
  const body = Matter.Bodies.rectangle(x, y, rect.width, rect.height, { restitution: 0.8 });
  Matter.World.add(world, body);
  bodies.push({ body, domElement: el });
}

// --- Main anchor block creator (now using fractional positions!) ---
function createAnchors(world, container, bodies, isOnMobile) {
  const spawnedAnchors = new Set();

  ANCHORS.forEach((anchor) => {
    // Get position using the new system
    const { x, y } = getAnchorPosition(anchor, isOnMobile);

     // 2. Determine display text based on device type for specific anchors
    let displayText = anchor.text; // Start with the original text from JSON

    // If it's NOT mobile (i.e., desktop), and the anchor is one of the targeted ones,
    // replace newline characters with spaces to make it single-line.
    if (!isOnMobile) {
      if (anchor.id === "main-name" || anchor.id === "contact") {
        displayText = anchor.text.replace(/\n/g, ' '); // Replace all occurrences of \n
      }
      // Add more 'else if (anchor.id === "some-other-id")' here if other anchors
      // need different desktop vs. mobile text formatting involving newlines.
    }
    // On mobile, displayText will retain any \n characters from anchor.text.


    // DOM setup
    const el = document.createElement('div');
    el.id = anchor.id;
    el.textContent = displayText;
    el.className = anchor.size === "big" ? "anchor-big anchor" : "anchor-small anchor";
     // Add any other classes based on anchor.class if you have that property
    if (anchor.class) { // Assuming you might have a general 'class' property for anchors
        el.classList.add(anchor.class);
    }
    el.style.position = 'absolute';
    container.appendChild(el);
    const rect = el.getBoundingClientRect();

    // Create Matter.js body *centered* at (x, y)
    const body = Matter.Bodies.rectangle(x, y, rect.width, rect.height, { isStatic: true });
    Matter.World.add(world, body);
    bodies.push({ body, domElement: el });

    // --- MODIFICATION FOR TOUCH & CLICK ---
    let lastTouchCoords = null;

    // Listen to touchend to capture coordinates
    el.addEventListener('touchend', (touchEvent) => {
      // Prevent click if touchend is part of a drag/scroll
      if (touchEvent.cancelable) { // Check if it can be cancelled
          // A simple check: if the touch moved significantly, it might be a scroll.
          // This is a basic heuristic. For robust drag detection, you'd need more.
          // For now, let's assume a tap doesn't move much.
      }
      if (touchEvent.changedTouches && touchEvent.changedTouches.length > 0) {
        lastTouchCoords = {
          clientX: touchEvent.changedTouches[0].clientX,
          clientY: touchEvent.changedTouches[0].clientY,
        };
      }
      // We don't preventDefault here usually, to allow the click event to fire.
      // However, if double spawning occurs, you might need to manage it.
    }, { passive: true }); // Use passive for touchend if not preventing default scroll

    el.addEventListener('click', (clickEvent) => {
      if (spawnedAnchors.has(anchor.id)) return;
      spawnedAnchors.add(anchor.id);

      // Determine the event coordinates to use for spawning
      const coordsToUse = lastTouchCoords || { // Prioritize last touch coordinates
        clientX: clickEvent.clientX,
        clientY: clickEvent.clientY,
      };

      anchor.microTexts.forEach((micro, microIdx) => {
        // Pass the determined coordinates (either from touch or click)
        spawnMicroText(world, container, bodies, micro, coordsToUse, microIdx);
      });

      lastTouchCoords = null; // Reset for the next interaction
    });
    // --- END MODIFICATION ---
  });
}

function addRagdoll(world, container, bodies, currentlyIsMobile) {
  const desktopScale = 1.0; // Original scale for desktop
  const mobileScale = 0.5;  // Example: Ragdoll is 70% of its desktop size on mobile
  const scale = currentlyIsMobile ? mobileScale : desktopScale;

  // Define initial spawn position based on device type
  const x = currentlyIsMobile ? window.innerWidth / 2 : window.innerWidth / 2 - 200;
  const y = currentlyIsMobile ? window.innerHeight * 0.28 : window.innerHeight / 4; // Spawn a bit higher on mobile


  Promise.all([
    loadAndMeasureImage(headPath, container, scale),
    loadAndMeasureImage(torsoPath, container, scale),
    loadAndMeasureImage(leftUpperArmPath, container, scale),
    loadAndMeasureImage(leftLowerArmPath, container, scale),
    loadAndMeasureImage(rightUpperArmPath, container, scale),
    loadAndMeasureImage(rightLowerArmPath, container, scale),
    loadAndMeasureImage(leftUpperLegPath, container, scale),
    loadAndMeasureImage(leftLowerLegPath, container, scale),
    loadAndMeasureImage(rightUpperLegPath, container, scale),
    loadAndMeasureImage(rightLowerLegPath, container, scale),
  ]).then(([
    headData,
    torsoData,
    leftUpperArmData,
    leftLowerArmData,
    rightUpperArmData,
    rightLowerArmData,
    leftUpperLegData,
    leftLowerLegData,
    rightUpperLegData,
    rightLowerLegData,
  ]) => {
    // Basic dimensions
    const headRadius = (headData.width * scale) / 2;
    const torsoW = torsoData.width;
    const torsoH = torsoData.height;

    // TORSO
    const torsoBody = Matter.Bodies.rectangle(
      x,
      y,
      torsoW,
      torsoH,
      { label: 'torso', chamfer: { radius: 10 * scale } }
    );

    // HEAD: place so its bottom touches torso's top
    const headBody = Matter.Bodies.circle(
      x,
      y - torsoH / 2 - (headData.height / 2),
      headData.width / 2,
      { label: 'head' }
    );

    // ARMS
    const luaW = leftUpperArmData.width;
    const luaH = leftUpperArmData.height;
    const llaW = leftLowerArmData.width;
    const llaH = leftLowerArmData.height;

    // LEFT UPPER ARM
    const leftShoulderX = x - torsoW / 2;
    const leftShoulderY = y - torsoH / 4;
    const leftUpperArmBody = Matter.Bodies.rectangle(
      leftShoulderX ,
      leftShoulderY + luaH / 2,
      luaW,
      luaH,
      { label: 'leftUpperArm', chamfer: { radius: 5 * scale } }
    );
    // LEFT LOWER ARM
    const leftLowerArmBody = Matter.Bodies.rectangle(
      leftShoulderX,
      (leftShoulderY + luaH / 2) + luaH / 2 + llaH / 2, 
      llaW,
      llaH,
      { label: 'leftLowerArm', chamfer: { radius: 5 * scale } }
    );

    // RIGHT ARMS
    const ruaW = rightUpperArmData.width;
    const ruaH = rightUpperArmData.height;
    const rlaW = rightLowerArmData.width;
    const rlaH = rightLowerArmData.height;

    const rightShoulderX = x + torsoW / 2;
    const rightShoulderY = y - torsoH / 4;
    const rightUpperArmBody = Matter.Bodies.rectangle(
      rightShoulderX,
      rightShoulderY + ruaH / 2,
      ruaW,
      ruaH,
      { label: 'rightUpperArm', chamfer: { radius: 5 * scale } }
    );
    const rightLowerArmBody = Matter.Bodies.rectangle(
      rightShoulderX,
      (rightShoulderY + ruaH / 2) + ruaH / 2 + rlaH / 2,
      rlaW,
      rlaH,
      { label: 'rightLowerArm', chamfer: { radius: 5 * scale } }
    );

    // LEGS
    const lulW = leftUpperLegData.width;
    const lulH = leftUpperLegData.height;
    const lllW = leftLowerLegData.width;
    const lllH = leftLowerLegData.height;

    // Left hip
    const leftHipX = x - torsoW / 4;
    const leftHipY = y + torsoH / 2;
    const leftUpperLegBody = Matter.Bodies.rectangle(
      leftHipX,
      leftHipY + lulH / 2,
      lulW,
      lulH,
      { label: 'leftUpperLeg', chamfer: { radius: 5 * scale } }
    );
    const leftLowerLegBody = Matter.Bodies.rectangle(
      leftHipX,
      leftHipY + lulH + lllH / 2,
      lllW,
      lllH,
      { label: 'leftLowerLeg', chamfer: { radius: 5 * scale } }
    );

    // Right hip
    const rulW = rightUpperLegData.width;
    const rulH = rightUpperLegData.height;
    const rllW = rightLowerLegData.width;
    const rllH = rightLowerLegData.height;

    const rightHipX = x + torsoW / 4;
    const rightHipY = y + torsoH / 2;
    const rightUpperLegBody = Matter.Bodies.rectangle(
      rightHipX,
      rightHipY + rulH / 2,
      rulW,
      rulH,
      { label: 'rightUpperLeg', chamfer: { radius: 5 * scale } }
    );
    const rightLowerLegBody = Matter.Bodies.rectangle(
      rightHipX,
      rightHipY + rulH + rllH / 2,
      rllW,
      rllH,
      { label: 'rightLowerLeg', chamfer: { radius: 5 * scale } }
    );

    // CONSTRAINTS
    const stiffConstraint = { stiffness: 0.6 };
    const constraints = [];

    // Neck
    constraints.push(Matter.Constraint.create({
      bodyA: headBody,
      pointA: { x: 0, y: headRadius },
      bodyB: torsoBody,
      pointB: { x: 0, y: -torsoH / 2 },
      ...stiffConstraint,
    }));

    // LEFT SHOULDER
    constraints.push(Matter.Constraint.create({
      bodyA: torsoBody,
      pointA: { x: -torsoW / 2, y: -torsoH / 4 },
      bodyB: leftUpperArmBody,
      pointB: { x: 0, y: -luaH / 2 },
      ...stiffConstraint,
    }));
    // LEFT ELBOW
    constraints.push(Matter.Constraint.create({
      bodyA: leftUpperArmBody,
      pointA: { x: 0, y: luaH / 2 },
      bodyB: leftLowerArmBody,
      pointB: { x: 0, y: -llaH / 2 },
      ...stiffConstraint,
    }));

    // RIGHT SHOULDER
    constraints.push(Matter.Constraint.create({
      bodyA: torsoBody,
      pointA: { x: torsoW / 2, y: -torsoH / 4 },
      bodyB: rightUpperArmBody,
      pointB: { x: 0, y: -ruaH / 2 },
      ...stiffConstraint,
    }));
    // RIGHT ELBOW
    constraints.push(Matter.Constraint.create({
      bodyA: rightUpperArmBody,
      pointA: { x: 0, y: ruaH / 2 },
      bodyB: rightLowerArmBody,
      pointB: { x: 0, y: -rlaH / 2 },
      ...stiffConstraint,
    }));

    // LEFT HIP
    constraints.push(Matter.Constraint.create({
      bodyA: torsoBody,
      pointA: { x: -torsoW / 4, y: torsoH / 2 },
      bodyB: leftUpperLegBody,
      pointB: { x: 0, y: -lulH / 2 },
      ...stiffConstraint,
    }));
    // LEFT KNEE
    constraints.push(Matter.Constraint.create({
      bodyA: leftUpperLegBody,
      pointA: { x: 0, y: lulH / 2 },
      bodyB: leftLowerLegBody,
      pointB: { x: 0, y: -lllH / 2 },
      ...stiffConstraint,
    }));

    // RIGHT HIP
    constraints.push(Matter.Constraint.create({
      bodyA: torsoBody,
      pointA: { x: torsoW / 4, y: torsoH / 2 },
      bodyB: rightUpperLegBody,
      pointB: { x: 0, y: -rulH / 2 },
      ...stiffConstraint,
    }));
    // RIGHT KNEE
    constraints.push(Matter.Constraint.create({
      bodyA: rightUpperLegBody,
      pointA: { x: 0, y: rulH / 2 },
      bodyB: rightLowerLegBody,
      pointB: { x: 0, y: -rllH / 2 },
      ...stiffConstraint,
    }));

    // Assemble composite
    const ragdoll = Matter.Composite.create({ label: 'ragdoll' });
    Matter.Composite.add(ragdoll, [
      headBody,
      torsoBody,
      leftUpperArmBody,
      leftLowerArmBody,
      rightUpperArmBody,
      rightLowerArmBody,
      leftUpperLegBody,
      leftLowerLegBody,
      rightUpperLegBody,
      rightLowerLegBody,
    ]);
    constraints.forEach(c => Matter.Composite.add(ragdoll, c));

    // Add to world!
    Matter.World.addComposite(world, ragdoll);

    // Sync DOM elements for each part:
    bodies.push({ body: headBody, domElement: headData.element });
    bodies.push({ body: torsoBody, domElement: torsoData.element });
    bodies.push({ body: leftUpperArmBody, domElement: leftUpperArmData.element });
    bodies.push({ body: leftLowerArmBody, domElement: leftLowerArmData.element });
    bodies.push({ body: rightUpperArmBody, domElement: rightUpperArmData.element });
    bodies.push({ body: rightLowerArmBody, domElement: rightLowerArmData.element });
    bodies.push({ body: leftUpperLegBody, domElement: leftUpperLegData.element });
    bodies.push({ body: leftLowerLegBody, domElement: leftLowerLegData.element });
    bodies.push({ body: rightUpperLegBody, domElement: rightUpperLegData.element });
    bodies.push({ body: rightLowerLegBody, domElement: rightLowerLegData.element });

  }).catch(err => console.error('Error loading ragdoll images:', err));
}


export function setupWhoPhysics() {

   // --- DEBUG RENDERER FLAG ---
  const DEBUG_WHO_PAGE = false; // << SET TO true TO ENABLE, false TO DISABLE

  // 1. Engine, world, boundaries, gravity
  const engine = initializeMatterEngine();
  const world = engine.world;
  

  let cleanupDeviceGravityListener = () => {}; // No-op function for cleanup
  const currentlyIsMobile = isMobile();

    if (isMobile()) {
      // On mobile, enable device orientation gravity.
      // This function from physicsSetup.js handles the permission prompt.
      cleanupDeviceGravityListener = enableDeviceGravity(engine);
    } else {
      // On desktop, set standard downward gravity.
      setGravity(engine, 0, 1);
    }

  const boundaries = createViewportBoundaries(world);
  const cleanupResize = handleResize(boundaries, world);

  // 2. Main container
  const container = document.createElement('div');
  container.id = 'container';
  document.body.appendChild(container);
  const bodies = [];

  // 3. Nav menu
  const navBodies = createPhysicsNavMenu(world, container, '/who');
  bodies.push(...navBodies);

  // 4. Add ragdoll
  addRagdoll(world, container, bodies, currentlyIsMobile);

  // 5. Anchors (with new fractional positioning)
  const isOnMobile = window.innerWidth <= 768;
  createAnchors(world, container, bodies, isOnMobile);

  // 6. Physics runner and sync
  const cleanupDragging = enableDragging(engine, world, container);
  const cleanupSyncLoop = syncDOMWithBodies(bodies, container);

  // 7. Runner
  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

   // --- DEBUG RENDERER SETUP ---
  let matterRenderInstance = null;
  let debugRendererResizeHandler = null;

  if (DEBUG_WHO_PAGE) {
    matterRenderInstance = Matter.Render.create({
      element: container, // Render inside your main physics container
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio, // For sharper rendering on high DPI screens
        background: 'transparent',       // So your DOM elements are visible underneath
        wireframeBackground: 'transparent',
        wireframes: true,                // Crucial: shows outlines, not solid shapes
        showAngleIndicator: true,
        showCollisions: true,
        showVelocity: true
      }
    });

    Matter.Render.run(matterRenderInstance);

    // Keep the renderer's canvas size in sync with the window
    debugRendererResizeHandler = () => {
      if (matterRenderInstance) {
        matterRenderInstance.canvas.width = window.innerWidth;
        matterRenderInstance.canvas.height = window.innerHeight;
        matterRenderInstance.options.width = window.innerWidth;
        matterRenderInstance.options.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', debugRendererResizeHandler);
  }
  // --- END DEBUG RENDERER SETUP ---

  

  return function teardownWhoPhysics() {
    Matter.Runner.stop(runner);

    // --- CLEANUP ---
    if (cleanupDeviceGravityListener) {
      cleanupDeviceGravityListener();
    }
    if (cleanupResize) { // Use the renamed variable
      cleanupResize();
    }
    if (cleanupSyncLoop) { // Call the stored cleanup function
      cleanupSyncLoop();
    }
    if (cleanupDragging) {
      cleanupDragging();
    }

    // Debug Renderer Cleanup
    if (DEBUG_WHO_PAGE && matterRenderInstance) {
      Matter.Render.stop(matterRenderInstance);
      if (matterRenderInstance.canvas && matterRenderInstance.canvas.parentNode) {
        matterRenderInstance.canvas.parentNode.removeChild(matterRenderInstance.canvas);
      }
      if (debugRendererResizeHandler) {
        window.removeEventListener('resize', debugRendererResizeHandler);
      }
    }
    // --- END CLEANUP ---

    // Clear bodies and DOM elements
    bodies.forEach(item => {
      if (item.body && world.bodies.includes(item.body)) {
         Matter.World.remove(world, item.body, true);
      }
      if (item.domElement && item.domElement.parentNode) {
        item.domElement.parentNode.removeChild(item.domElement);
      }
    });
    bodies.length = 0;

    Matter.World.clear(world, false);
    Matter.Engine.clear(engine);

    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };
}
