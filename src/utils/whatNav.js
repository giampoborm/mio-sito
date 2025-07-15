// src/utils/whatNav.js
import Matter from 'matter-js';
import { measureTextDimensions } from './generalUtils.js';
import { getRandomColor, getNavHighlightColor, setNavHighlightColor } from './colorSystem.js';

/**
 * Creates the specific navigation menu for the what page.
 *
 * This menu consists of two buttons (Previous and Next) that allow the user to navigate between projects.
 * They are placed at the bottom center of the viewport. If the current project is the first, only Next is shown;
 * if it's the last, only Previous is shown.
 *
 * @param {Matter.World} world - The Matter.js world to add the buttons to.
 * @param {HTMLElement} container - The container element where the DOM buttons are appended.
 * @param {number} currentProjectIndex - The index of the current project (0-based).
 * @param {number} totalProjects - The total number of projects.
 * @returns {Array<Object>} An array of objects for each button containing { body, domElement, target }.
 */
export function createWhatProjectNav(world, container, currentProjectIndex, totalProjects) {
  const margin = 20; // Margin from the bottom of the viewport.
  const spacing = 20; // Space between the two buttons.
  const navButtons = [];

  // Determine which buttons to show.
  const showPrevious = currentProjectIndex > 0;
  const showNext = currentProjectIndex < totalProjects - 1;

  // Prepare button data (display label and a target value).
  const buttonsData = [];
  if (showPrevious) {
    // For the previous button, label it simply as "Previous"
    buttonsData.push({ display: 'previous', target: 'previous' });
  }
  if (showNext) {
    // For the next button, label it as "Next"
    buttonsData.push({ display: 'next', target: 'next' });
  }

  // First, measure each button's text dimensions using the helper.
  // The helper creates a temporary DOM element with the class "what-nav-button" to get the correct size.
  const measuredButtons = buttonsData.map(data => {
    const dims = measureTextDimensions(data.display, 'what-nav-button');
    return { ...data, width: dims.width, height: dims.height };
  });

  // Compute the total width occupied by the buttons (including spacing if both are present).
  let combinedWidth = measuredButtons.reduce((sum, btn, index) => {
    return sum + btn.width + (index > 0 ? spacing : 0);
  }, 0);

  // Determine the starting x-coordinate so that the combined buttons are centered.
  let startX = (window.innerWidth - combinedWidth) / 2;

  // For each button, create the Matter.js body and DOM element.
  measuredButtons.forEach((buttonData, index) => {
    const centerX = startX + buttonData.width / 2;
    const centerY = window.innerHeight - margin - buttonData.height / 2;

    // Create a static Matter.js body with exactly the measured dimensions.
    const body = Matter.Bodies.rectangle(centerX, centerY, buttonData.width, buttonData.height, { isStatic: true });

    // Create the corresponding DOM element.
    const buttonElement = document.createElement('div');
    buttonElement.textContent = buttonData.display;
    // Minimal inline style for positioning; visual styling should be done via the CSS class.
    buttonElement.style.position = 'absolute';
    buttonElement.classList.add('what-nav-button');

    // Append the DOM element to the container.
    container.appendChild(buttonElement);
    // Add the body to the Matter.js world.
    Matter.World.add(world, body);

    buttonElement.dataset.currentColor = '';

    buttonElement.addEventListener('mouseenter', () => {
      const other = navButtons.find(nb => nb.domElement && nb.domElement !== buttonElement);
      const exclude = [getNavHighlightColor()];
      if (other && other.domElement.dataset.currentColor) {
        exclude.push(other.domElement.dataset.currentColor);
      }
      const c = getRandomColor(exclude);
      buttonElement.style.color = c;
      buttonElement.dataset.currentColor = c;
    });

    buttonElement.addEventListener('mouseleave', () => {
      buttonElement.style.color = '#000';
      buttonElement.dataset.currentColor = '';
    });

    buttonElement.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = buttonElement.dataset.currentColor || getRandomColor([getNavHighlightColor()]);
      setNavHighlightColor(c);
      const navEvent = new CustomEvent('whatProjectNav', { detail: { target: buttonData.target } });
      window.dispatchEvent(navEvent);
    });

    navButtons.push({ body, domElement: buttonElement, target: buttonData.target });

    // Update startX for the next button.
    startX += buttonData.width + spacing;
  });

  return navButtons;
}
