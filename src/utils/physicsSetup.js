import Matter from 'matter-js';
import { requestIOSMotionPermission } from './iosPermission';

// Initialize the Matter.js Engine and World
export function initializeMatterEngine() {
  const engine = Matter.Engine.create();
  return engine;
}

// Create viewport boundaries
export function createViewportBoundaries(world, width = window.innerWidth, height = window.innerHeight) {
  const thickness = 50;
  const boundaries = [
    Matter.Bodies.rectangle(width / 2, -thickness / 2, width, thickness, { isStatic: true }),
    Matter.Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, { isStatic: true }),
    Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height, { isStatic: true }),
    Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, { isStatic: true })
  ];
  Matter.World.add(world, boundaries);
  return boundaries;
}

// MODIFIED: Sync DOM elements with Matter.js bodies
export function syncDOMWithBodies(bodies, container) {
  let animationFrameId = null; // Store the animation frame ID

  function sync() {
    for (const { body, domElement } of bodies) {
      // Ensure domElement still exists and is in the DOM
      if (domElement && domElement.isConnected && domElement.offsetParent !== null) {
        const x = body.position.x;
        const y = body.position.y;
        const w = domElement.offsetWidth;
        const h = domElement.offsetHeight;
        const angle = body.angle;
        domElement.style.transform =
          `translate(${x - w / 2}px, ${y - h / 2}px) rotate(${angle}rad)`;
      }
    }
    animationFrameId = requestAnimationFrame(sync);
  }
  sync();

  // Return a function to stop the animation loop
  return function cleanupSync() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
}


// Add Mouse Interaction for Dragging
export function enableDragging(engine, world, container) {
  const mouse = Matter.Mouse.create(container);
  const mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false },
    },
  });
  Matter.World.add(world, mouseConstraint);

  // Custom mobile-friendly tap/drag detection
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };

  container.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = false;
      dragStart = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        isDragging = true;
      }
    }
  }, { passive: true });

  container.addEventListener('touchend', (e) => {
    if (!isDragging && e.target.closest('a, button, .link-text, #container')) {
      e.preventDefault();
      e.target.click();
    }
  });

  return mouseConstraint;
}

// Set or Adjust Gravity Dynamically
export function setGravity(engine, x = 0, y = 1) {
  engine.gravity.x = x;
  engine.gravity.y = y;
}




export function enableDeviceGravity(engine) {
  let isListening = false; // Flag to track if the event listener is active
  let currentHandler = null; // Store the active handler reference for removal

  // 1. The core function that updates gravity based on device orientation
  const handleOrientation = (event) => {
    // Guard: If the engine or gravity object doesn't exist (e.g., during teardown), do nothing.
    if (!engine || !engine.gravity) {
      // console.warn('Engine or engine.gravity is not available in handleOrientation.');
      return;
    }

    const { beta, gamma } = event; // beta is front-to-back, gamma is side-to-side

    // Normalize gamma and beta to a range (e.g., -1 to 1) for gravity
    // Adjust the division factor (e.g., 90) to control sensitivity
    const gravityX = Math.max(-1, Math.min(1, (gamma || 0) / 90)); // Use (gamma || 0) for safety
    const gravityY = Math.max(-1, Math.min(1, (beta || 0) / 90));  // Use (beta || 0) for safety

    engine.gravity.x = gravityX;
    engine.gravity.y = gravityY;
  };

  // 2. Fallback function if orientation is not available or not permitted
  const fallbackToDefaultGravity = () => {
    // console.log('Falling back to default gravity.');
    setGravity(engine, 0, 1); // Or your desired default (e.g., randomGravity())
  };

  // 3. Function to start listening to device orientation events
  const startListeningToOrientation = () => {
    if (!isListening) { // Prevent adding multiple listeners
      // Store the handler reference
      currentHandler = handleOrientation;
      window.addEventListener('deviceorientation', currentHandler, true);
      isListening = true;
      // console.log('Device orientation listener added.');
    }
  };

  // 4. The cleanup function that will be returned
  // This function is responsible for removing the event listener
  const cleanupDeviceGravity = () => {
    if (isListening && currentHandler) {
      window.removeEventListener('deviceorientation', currentHandler, true);
      isListening = false;
      currentHandler = null; // Clear the stored handler
      // console.log('Device orientation listener removed.');
    }
  };

  // 5. Logic to request permission (for iOS) and enable tilt gravity
  const attemptToEnableTiltGravity = () => {
    // A. iOS 13+ requires explicit permission for DeviceOrientationEvent
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      DeviceOrientationEvent.requestPermission()
        .then(permissionState => {
          if (permissionState === 'granted') {
            startListeningToOrientation();
          } else {
            // console.warn('Device orientation permission not granted by user.');
            fallbackToDefaultGravity();
          }
        })
        .catch(error => {
          // This catch block might be hit if the user dismisses the prompt too quickly
          // or if there's an unexpected issue with the API.
          // console.error('Error requesting device orientation permission:', error);
          // Attempt with DeviceMotionEvent as a deeper fallback for some iOS quirks (less common now)
          if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
              .then(motionPermissionState => {
                if (motionPermissionState === 'granted') {
                  // While DeviceMotionEvent is granted, we still prefer DeviceOrientationEvent for tilt
                  // This path usually means the user denied DeviceOrientation but might allow generic motion.
                  // If you strictly need DeviceOrientation, you might just fallback here.
                  // For simplicity, let's assume if motion is granted, orientation might work (or try adding again).
                  startListeningToOrientation();
                } else {
                  fallbackToDefaultGravity();
                }
              })
              .catch(motionError => {
                // console.error('Error requesting device motion permission:', motionError);
                fallbackToDefaultGravity();
              });
          } else {
            fallbackToDefaultGravity();
          }
        });
    } else {
      // B. For Android devices or older iOS versions/other browsers that don't require explicit permission,
      // or if DeviceOrientationEvent itself is not defined (very unlikely for modern browsers).
      // We can try to attach the listener directly.
      // It's good to check if 'ondeviceorientation' is in window to be more robust.
      if ('ondeviceorientation' in window) {
        startListeningToOrientation();
      } else {
        // console.warn('Device orientation events not supported by this browser/device.');
        fallbackToDefaultGravity();
      }
    }
  };

  // 6. Check user's stored preference (if any)
  const userPreference = localStorage.getItem('gravity-mode');

  if (userPreference === 'orientation') {
    attemptToEnableTiltGravity();
  } else if (userPreference === 'normal') {
    fallbackToDefaultGravity();
  } else {
    // 7. If no preference, ask the user (this typically involves your custom UI prompt)
    // `requestIOSMotionPermission` is your custom function that shows a dialog
    requestIOSMotionPermission(
      () => { // This is the 'yes' (enable) callback from your dialog
        localStorage.setItem('gravity-mode', 'orientation');
        attemptToEnableTiltGravity();
      },
      () => { // This is the 'no' (fallback) callback from your dialog
        localStorage.setItem('gravity-mode', 'normal');
        fallbackToDefaultGravity();
      }
    );
  }

  // 8. Return the cleanup function so it can be called when the physics setup is torn down
  return cleanupDeviceGravity;
}


// Simple mobile device detection
export function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

// Handle Window Resize for Boundaries
export function handleResize(boundaries, world) {
  const resizeHandler = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    boundaries.forEach((boundary, index) => {
      if (index === 0) Matter.Body.setPosition(boundary, { x: width / 2, y: -25 });
      if (index === 1) Matter.Body.setPosition(boundary, { x: width / 2, y: height + 25 });
      if (index === 2) Matter.Body.setPosition(boundary, { x: -25, y: height / 2 });
      if (index === 3) Matter.Body.setPosition(boundary, { x: width + 25, y: height / 2 });
    });
  };

  window.addEventListener('resize', resizeHandler);
  return () => window.removeEventListener('resize', resizeHandler);
}

// Clean up a Matter.js engine, runner, container, etc.
export function teardownMatter(engine, runner, container) {
  if (runner) Matter.Runner.stop(runner);
  if (engine) {
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
  }
  if (container && container.parentNode) container.remove();
}
