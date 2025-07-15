
import { requestIOSMotionPermission } from '../utils/iosPermission.js';
import { getRandomColor, setNavHighlightColor } from '../utils/colorSystem.js';

const TILT_THRESHOLD = 8; // degrees for zone changes
const PARALLAX_RANGE = 3; // additional degrees for micro-shift

function setupGyroColorSwitch(topDiv, bottomDiv, cancelDemo) {
  let lastTop = null,
    lastBottom = null,
    baseline = null,
    currentState = 'neutral';

  // apply the snap easing once at setup
  const transition = 'background 180ms ease-out, background-position 180ms ease-out';
  topDiv.style.transition = transition;
  bottomDiv.style.transition = transition;

  const clearParallax = () => {
    topDiv.style.backgroundPosition = '';
    bottomDiv.style.backgroundPosition = '';
  };

  const applyShift = (el, diff) => {
    const clamped = Math.max(-PARALLAX_RANGE, Math.min(PARALLAX_RANGE, diff));
    const px = (clamped / PARALLAX_RANGE) * 15; // max ~15px shift
    el.style.backgroundPosition = `center calc(50% + ${px}px)`;
  };

  function handleOrientation(event) {
    if (baseline === null) baseline = event.beta;
    const beta = event.beta - baseline;
    let nextState = 'neutral';
    if (beta >= TILT_THRESHOLD) nextState = 'who';
    else if (beta <= -TILT_THRESHOLD) nextState = 'what';

    if (nextState !== currentState) {
      currentState = nextState;
      clearParallax();
      if (currentState === 'who') {
        const color = getRandomColor([lastTop, lastBottom]);
        topDiv.style.background = color;
        bottomDiv.style.background = '#fff';
        lastTop = color;
      } else if (currentState === 'what') {
        const color = getRandomColor([lastBottom, lastTop]);
        bottomDiv.style.background = color;
        topDiv.style.background = '#fff';
        lastBottom = color;
      } else {
        topDiv.style.background = '#fff';
        bottomDiv.style.background = '#fff';
      }
      if (currentState !== 'neutral' && typeof cancelDemo === 'function') {
        cancelDemo();
      }
    }

    // micro parallax within zone
    if (currentState === 'who') {
      applyShift(topDiv, beta - TILT_THRESHOLD);
    } else if (currentState === 'what') {
      applyShift(bottomDiv, beta + TILT_THRESHOLD);
    }
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  return () => window.removeEventListener('deviceorientation', handleOrientation, true);
}

export function renderHomepage(app) {
  app.innerHTML = "";

  const container = document.createElement("div");
  container.className = "home-split";

  // Top (who)
  const whoDiv = document.createElement("div");
  whoDiv.className = "home-side who-side";
  whoDiv.textContent = "who?";
  container.appendChild(whoDiv);

  // Bottom (what)
  const whatDiv = document.createElement("div");
  whatDiv.className = "home-side what-side";
  whatDiv.textContent = "what?";
  container.appendChild(whatDiv);

  app.appendChild(container);

  // ------- auto demo hint -------
  let demoTimeout;
  let demoHint;
  const demoSteps = [];

  const cancelDemo = () => {
    if (demoTimeout) clearTimeout(demoTimeout);
    demoTimeout = null;
    demoSteps.forEach(t => clearTimeout(t));
    demoSteps.length = 0;
    if (demoHint) {
      demoHint.remove();
      demoHint = null;
    }
  };

  const startDemo = () => {
    const topColor = getRandomColor();
    const bottomColor = getRandomColor([topColor]);
    demoHint = document.createElement('div');
    demoHint.id = 'tilt-hint';
    demoHint.textContent = 'Tilt to choose';
    document.body.appendChild(demoHint);
    demoSteps.push(setTimeout(() => {
      whoDiv.style.background = topColor;
      whatDiv.style.background = '#fff';
    }, 50));
    demoSteps.push(setTimeout(() => {
      whoDiv.style.background = '#fff';
      whatDiv.style.background = bottomColor;
    }, 350));
    demoSteps.push(setTimeout(() => {
      whoDiv.style.background = '#fff';
      whatDiv.style.background = '#fff';
    }, 650));
  };

  demoTimeout = setTimeout(startDemo, 2000);

  // dismiss hint on tap
  container.addEventListener('touchstart', cancelDemo, { once: false });
  container.addEventListener('mousedown', cancelDemo, { once: false });

  // Routing
  whoDiv.addEventListener("click", () => {
    if (lastWhoColor) setNavHighlightColor(lastWhoColor);
    cancelDemo();
    history.pushState({}, "", "/who");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  whatDiv.addEventListener("click", () => {
    if (lastWhatColor) setNavHighlightColor(lastWhatColor);
    cancelDemo();
    history.pushState({}, "", "/what");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  // Desktop hover logic
  let lastWhoColor = null, lastWhatColor = null;
  whoDiv.addEventListener("mouseenter", () => {
    if (window.innerWidth > 800) {
      const color = getRandomColor([lastWhoColor, lastWhatColor]);
      whoDiv.style.background = color;
      lastWhoColor = color;
    }
  });
  whoDiv.addEventListener("mouseleave", () => {
    if (window.innerWidth > 800) whoDiv.style.background = "#fff";
  });
  whatDiv.addEventListener("mouseenter", () => {
    if (window.innerWidth > 800) {
      const color = getRandomColor([lastWhatColor, lastWhoColor]);
      whatDiv.style.background = color;
      lastWhatColor = color;
    }
  });
  whatDiv.addEventListener("mouseleave", () => {
    if (window.innerWidth > 800) whatDiv.style.background = "#fff";
  });

  // Mobile: ask for motion permission first, then activate gyro logic
  let teardownGyro = null;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    requestIOSMotionPermission(
      // enableOrientationCallback:
      () => {
        teardownGyro = setupGyroColorSwitch(whoDiv, whatDiv, cancelDemo);
      },
      // fallbackCallback:
      () => {
        // No gyro: maybe show a message, or just leave colors static
        // Optionally: set both backgrounds to white for clarity
        whoDiv.style.background = "#fff";
        whatDiv.style.background = "#fff";
        cancelDemo();
      }
    );
  }

  return () => {
    if (teardownGyro) teardownGyro();
    // Any further cleanup if needed
  };
}
