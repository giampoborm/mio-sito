
import { getRandomColor, setNavHighlightColor } from '../utils/colorSystem.js';

let lastWhoColor = null;
let lastWhatColor = null;

function initTiltHome(container, highlight, whoDiv, whatDiv, reducedMotion) {
  let baseBeta = null;
  let currentZone = 'neutral';
  let listener = null;
  highlight.classList.add('home-highlight--neutral');

  let hintEl = null;
  let demoTimer = null;

  const showHint = () => {
    if (hintEl) return;
    hintEl = document.createElement('div');
    hintEl.id = 'tilt-hint';
    hintEl.textContent = 'Tilt to choose';
    container.appendChild(hintEl);
  };

  const removeHint = () => {
    if (hintEl) {
      hintEl.remove();
      hintEl = null;
    }
  };

  const dismissHint = () => {
    if (!sessionStorage.getItem('tiltHintDismissed')) {
      sessionStorage.setItem('tiltHintDismissed', 'true');
    }
    removeHint();
    if (demoTimer) {
      clearTimeout(demoTimer);
      demoTimer = null;
    }
  };

  const runDemo = () => {
    const duration = reducedMotion ? 0 : 180;
    highlight.style.transitionDuration = `${duration}ms`;
    highlight.classList.add('home-highlight--top');
    highlight.style.setProperty('--session-colour', getRandomColor());
    setTimeout(() => {
      highlight.classList.replace('home-highlight--top', 'home-highlight--bottom');
      highlight.style.setProperty('--session-colour', getRandomColor());
      setTimeout(() => {
        highlight.classList.replace('home-highlight--bottom', 'home-highlight--top');
        highlight.style.setProperty('--session-colour', getRandomColor());
      }, duration);
    }, duration);
  };

  if (!sessionStorage.getItem('tiltHintDismissed')) {
    demoTimer = setTimeout(() => {
      runDemo();
      showHint();
    }, 1500);
  }

  whoDiv.addEventListener('click', dismissHint);
  whatDiv.addEventListener('click', dismissHint);

  const applyZone = (zone, delta) => {
    if (zone !== currentZone) {
      currentZone = zone;
      highlight.classList.remove('home-highlight--top', 'home-highlight--bottom', 'home-highlight--neutral');
      highlight.classList.add(`home-highlight--${zone}`);
      if (zone === 'top') {
        const c = getRandomColor();
        highlight.style.setProperty('--session-colour', c);
        lastWhoColor = c;
      } else if (zone === 'bottom') {
        const c = getRandomColor();
        highlight.style.setProperty('--session-colour', c);
        lastWhatColor = c;
      }
    }

    if (!reducedMotion && (zone === 'top' || zone === 'bottom')) {
      const center = zone === 'top' ? -8 : 8;
      const residual = Math.max(-3, Math.min(3, delta - center));
      const offset = (residual / 3) * 4; // up to ±4% translate
      highlight.style.setProperty('--parallax', `${offset}%`);
    } else {
      highlight.style.setProperty('--parallax', '0%');
    }
  };

  const handleOrientation = (e) => {
    if (baseBeta === null) baseBeta = e.beta;
    const delta = e.beta - baseBeta;
    let zone = 'neutral';
    if (delta <= -8) zone = 'top';
    else if (delta >= 8) zone = 'bottom';
    applyZone(zone, delta);
    dismissHint();
  };

  const start = () => {
    if (!listener) {
      listener = handleOrientation;
      window.addEventListener('deviceorientation', listener, { passive: true });
    }
  };

  const stop = () => {
    if (listener) {
      window.removeEventListener('deviceorientation', listener, { passive: true });
      listener = null;
    }
  };

  const fallbackToTap = () => {
    stop();
    highlight.classList.add('home-highlight--neutral');
  };

  const requestPermissionAndStart = async () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) {
      try {
        const state = await DeviceOrientationEvent.requestPermission();
        if (state === 'granted') start();
        else fallbackToTap();
      } catch {
        fallbackToTap();
      }
    } else {
      start();
    }
  };

  requestPermissionAndStart();

  return stop;
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

  const highlight = document.createElement('div');
  highlight.className = 'home-highlight';
  container.appendChild(highlight);

  app.appendChild(container);

  // Routing
  whoDiv.addEventListener("click", () => {
    if (lastWhoColor) setNavHighlightColor(lastWhoColor);
    history.pushState({}, "", "/who");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  whatDiv.addEventListener("click", () => {
    if (lastWhatColor) setNavHighlightColor(lastWhatColor);
    history.pushState({}, "", "/what");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  // Desktop hover logic
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

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  highlight.style.setProperty('--highlight-duration', prefersReduced ? '0ms' : '180ms');

  const teardownTilt = initTiltHome(container, highlight, whoDiv, whatDiv, prefersReduced);

  return () => {
    teardownTilt();
  };
}
