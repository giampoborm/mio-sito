import { setupWhatPhysics } from '../utils/whatPhysics.js';

export function renderWhatpage(app) {
  // Clear the main app container.
  app.innerHTML = '';

  // Initialize the what page physics simulation.
  // This function returns a teardown function.
  const teardownWhatPhysics = setupWhatPhysics();

  // Return the teardown function so that the router can call it when leaving this page.
  return teardownWhatPhysics;
}
