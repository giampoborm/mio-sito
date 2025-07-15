import { requestIOSMotionPermission } from '../utils/iosPermission.js';
import { getRandomColor, setNavHighlightColor } from '../utils/colorSystem.js';

/**
 * Initialise tilt interaction on the home page.
 * Calibrates on first event and updates pane background colour based on device orientation.
 * Returns a teardown function removing the event listener.
 */
function initTiltHome(whoPane, whatPane) {
  let baseBeta = null;
  let active = 'none';

  const handleOrientation = (e) => {
    if (baseBeta === null) baseBeta = e.beta;
    const dBeta = e.beta - baseBeta;
    let newActive = 'none';
    if (dBeta <= -8) newActive = 'who';
    else if (dBeta >= 8) newActive = 'what';

    if (newActive !== active) {
      if (newActive === 'who') {
        whoPane.style.setProperty('--pane-bkg', 'var(--session-colour)');
        whatPane.style.setProperty('--pane-bkg', '#fff');
      } else if (newActive === 'what') {
        whatPane.style.setProperty('--pane-bkg', 'var(--session-colour)');
        whoPane.style.setProperty('--pane-bkg', '#fff');
      } else {
        whoPane.style.setProperty('--pane-bkg', '#fff');
        whatPane.style.setProperty('--pane-bkg', '#fff');
      }
      whoPane.style.setProperty('--bkg-offset', '0px');
      whatPane.style.setProperty('--bkg-offset', '0px');
      active = newActive;
    }

    // micro parallax up to ±3°
    if (active === 'who') {
      const extra = Math.max(-3, Math.min(dBeta + 8, 3));
      whoPane.style.setProperty('--bkg-offset', `${(extra / 3) * 10}px`);
    } else if (active === 'what') {
      const extra = Math.max(-3, Math.min(dBeta - 8, 3));
      whatPane.style.setProperty('--bkg-offset', `${(extra / 3) * 10}px`);
    }
  };

  window.addEventListener('deviceorientation', handleOrientation, true);
  return () => window.removeEventListener('deviceorientation', handleOrientation, true);
}

export function renderHomepage(app) {
  app.innerHTML = '';

  const container = document.createElement('div');
  container.className = 'home-split';

  const whoPane = document.createElement('section');
  whoPane.id = 'pane-who';
  whoPane.className = 'home-side pane pane--top';
  whoPane.textContent = 'who?';

  const whatPane = document.createElement('section');
  whatPane.id = 'pane-what';
  whatPane.className = 'home-side pane pane--bottom';
  whatPane.textContent = 'what?';

  container.appendChild(whoPane);
  container.appendChild(whatPane);
  app.appendChild(container);

  const root = document.documentElement;
  const sessionColor = getRandomColor();
  root.style.setProperty('--session-colour', sessionColor);

  // routing on tap
  whoPane.addEventListener('click', () => {
    setNavHighlightColor(sessionColor);
    history.pushState({}, '', '/who');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  whatPane.addEventListener('click', () => {
    setNavHighlightColor(sessionColor);
    history.pushState({}, '', '/what');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });

  // fallback tap-colour change if orientation not granted
  const tapSwap = (target) => {
    if (target === 'who') {
      whoPane.style.setProperty('--pane-bkg', 'var(--session-colour)');
      whatPane.style.setProperty('--pane-bkg', '#fff');
    } else {
      whatPane.style.setProperty('--pane-bkg', 'var(--session-colour)');
      whoPane.style.setProperty('--pane-bkg', '#fff');
    }
  };
  whoPane.addEventListener('touchstart', () => tapSwap('who'));
  whatPane.addEventListener('touchstart', () => tapSwap('what'));

  let teardownTilt = null;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    requestIOSMotionPermission(
      () => {
        teardownTilt = initTiltHome(whoPane, whatPane);
      },
      () => {
        whoPane.style.setProperty('--pane-bkg', '#fff');
        whatPane.style.setProperty('--pane-bkg', '#fff');
      }
    );
  }

  // auto demo after idle
  const demoTimeout = setTimeout(() => {
    const hint = document.createElement('div');
    hint.textContent = 'Tilt to choose';
    hint.style.position = 'absolute';
    hint.style.top = '50%';
    hint.style.left = '50%';
    hint.style.transform = 'translate(-50%, -50%)';
    hint.style.pointerEvents = 'none';
    app.appendChild(hint);

    const seq = [
      () => {
        whoPane.style.setProperty('--pane-bkg', 'var(--session-colour)');
        whatPane.style.setProperty('--pane-bkg', '#fff');
      },
      () => {
        whoPane.style.setProperty('--pane-bkg', '#fff');
        whatPane.style.setProperty('--pane-bkg', 'var(--session-colour)');
      },
      () => {
        whoPane.style.setProperty('--pane-bkg', '#fff');
        whatPane.style.setProperty('--pane-bkg', '#fff');
        hint.remove();
      }
    ];

    let step = 0;
    const interval = setInterval(() => {
      seq[step]();
      step += 1;
      if (step === seq.length) clearInterval(interval);
    }, 400);
  }, 1500);

  const cancelDemo = () => clearTimeout(demoTimeout);
  window.addEventListener('deviceorientation', cancelDemo, { once: true });
  document.addEventListener('touchstart', cancelDemo, { once: true });

  return () => {
    if (teardownTilt) teardownTilt();
    clearTimeout(demoTimeout);
  };
}
