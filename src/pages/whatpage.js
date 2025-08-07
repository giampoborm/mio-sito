import { setupWhatPhysics } from '../utils/whatPhysics.js';
import { isMobile } from '../utils/physicsSetup.js';

export function renderWhatpage(app) {
  // Clear the main app container.
  app.innerHTML = '';

  // Initialize the what page physics simulation.
  // This function returns a teardown function.
  const teardownWhatPhysics = setupWhatPhysics();

  let nudgeTimeoutId;
  let nudgeRemoveTimeoutId;
  let nudgeEl;

  const removeNudge = () => {
    if (nudgeEl && nudgeEl.parentNode) {
      nudgeEl.parentNode.removeChild(nudgeEl);
    }
    window.removeEventListener('touchstart', removeNudge);
  };

  if (isMobile()) {
    nudgeTimeoutId = setTimeout(() => {
      nudgeEl = document.createElement('div');
      nudgeEl.textContent = 'tap the empty space';
      nudgeEl.className = 'tap-nudge';
      document.body.appendChild(nudgeEl);
      window.addEventListener('touchstart', removeNudge);
      nudgeRemoveTimeoutId = setTimeout(removeNudge, 4000);
    }, 2000);
  }

  // Return the teardown function so that the router can call it when leaving this page.
  return () => {
    teardownWhatPhysics();
    clearTimeout(nudgeTimeoutId);
    clearTimeout(nudgeRemoveTimeoutId);
    removeNudge();
  };
}
