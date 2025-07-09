// src/utils/fullProjectModal.js
import { setupVideoPlayback } from './generalUtils.js';

/**
 * Opens a modal displaying the full project details.
 * If projectDetails has sections, it iterates over them; otherwise, it uses a flat elements array.
 */
export function openFullProjectModal(projectDetails) {
  // Create the overlay.
  const modalOverlay = document.createElement('div');
  modalOverlay.classList.add('full-project-modal-overlay');

  // Create the modal container (grid container).
  const modalContainer = document.createElement('div');
  modalContainer.classList.add('modal-container');

  // Create and append a close button.
  const closeButton = document.createElement('button');
  closeButton.textContent = 'close';
  closeButton.classList.add('modal-close-button');
  closeButton.addEventListener('click', () => {
    closeFullProjectModal(modalOverlay);
  });
  modalContainer.appendChild(closeButton);

  // Build content from sections if available; otherwise, use flat elements.
  if (projectDetails.sections && Array.isArray(projectDetails.sections)) {
    projectDetails.sections.forEach((section) => {
      const sectionEl = document.createElement('div');
      sectionEl.classList.add('modal-section');
      if (section.type) {
        sectionEl.classList.add(`modal-section-${section.type}`);
      }
      section.elements.forEach((item) => {
        const itemEl = createFullProjectElement(item);
        sectionEl.appendChild(itemEl);
      });
      modalContainer.appendChild(sectionEl);
    });
  } else if (projectDetails.elements && Array.isArray(projectDetails.elements)) {
    projectDetails.elements.forEach((item) => {
      const itemEl = createFullProjectElement(item);
      modalContainer.appendChild(itemEl);
    });
  }

  modalOverlay.appendChild(modalContainer);
  reorderSidebarForMobile(modalContainer);
  document.body.appendChild(modalOverlay);
  return modalOverlay;
}

/**
 * Closes and removes the modal overlay from the DOM.
 */
export function closeFullProjectModal(modalOverlay) {
  if (modalOverlay && modalOverlay.parentNode) {
    modalOverlay.parentNode.removeChild(modalOverlay);
  }
}

/**
 * Creates a DOM element for a project detail item and applies explicit grid placement if specified.
 */
function createFullProjectElement(item) {
  let el;
  switch (item.type) {
    case 'image':
      el = document.createElement('img');
      el.src = item.src;
      el.classList.add('full-project-image');
      break;
    case 'text':
      el = document.createElement('div');
      el.innerHTML = item.content.replace(/\n/g, '<br>');
      el.classList.add('full-project-text');
      break;
    case 'video':
      el = document.createElement('video');
      el.src = item.src;
      el.controls = true;
      el.classList.add('full-project-video');
      setupVideoPlayback(el);
      break;
    default:
      el = document.createElement('div');
      el.textContent = 'Unknown element type';
      el.classList.add('full-project-unknown');
  }

  // Add any custom class provided.
  if (item.class) {
    el.classList.add(item.class);
  }

  // Apply explicit grid placement if provided.
  if (item.gridColumnStart && item.columns) {
    el.style.gridColumn = `${item.gridColumnStart} / span ${item.columns}`;
  } else if (item.sidebar) {
    el.classList.add('col-sidebar');
  } else if (item.columns) {
    el.classList.add(`col-span-${item.columns}`);
  } else {
    // Default: text elements span 4 columns, images/videos span 1.
    el.classList.add(item.type === 'text' ? 'col-span-4' : 'col-span-1');
  }

  if (item.gridRowStart) {
    if (item.gridRowEnd) {
      el.style.gridRow = `${item.gridRowStart} / ${item.gridRowEnd}`;
    } else {
      el.style.gridRow = `${item.gridRowStart} / span 1`;
    }
  }
  
  return el;
}

// Helper: On small screens move sidebar elements before the preceding item
function reorderSidebarForMobile(container) {
  // Ensure we only run once per modal instance
  if (container.__sidebarReordered) return;
  container.__sidebarReordered = true;

  if (window.innerWidth > 768) return;

  const pairs = Array.from(container.querySelectorAll('.col-sidebar')).map((item) => ({
    item,
    prev: item.previousElementSibling,
  }));

  pairs.forEach(({ item, prev }) => {
    if (prev && prev.parentNode) {
      prev.parentNode.insertBefore(item, prev);
    }
  });
}
