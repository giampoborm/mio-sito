import { setupWhoPhysics } from '../utils/whoPhysics.js';

export function renderWhopage(app) {
  // Clear the main app container
  app.innerHTML = '';

  // Set up the who page physics simulation and capture the teardown function
  const teardownWhoPhysics = setupWhoPhysics();

  // Return the teardown function for the router to use
  return teardownWhoPhysics;
}
