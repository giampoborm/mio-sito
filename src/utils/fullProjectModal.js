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
  if (window.innerWidth <= 768) {
    reorderSidebarForMobile(modalContainer);
  }
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
    el.dataset.mobileOrder = item.mobileOrder || 0;
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

// Helper: reorder sidebar items according to their mobileOrder value
function reorderSidebarForMobile(modal) {
  const children = Array.from(modal.children);

  children.forEach((el, i) => {
    if (!el.classList.contains('col-sidebar')) return;

    const shift = Number(el.dataset.mobileOrder || 0);
    if (shift === 0) return;  // default already handled elsewhere

    const targetIndex = Math.max(
      0,
      Math.min(children.length - 1, i + shift)
    );

    const anchor = children[targetIndex];
    anchor.parentNode.insertBefore(
      el,
      shift < 0 ? anchor : anchor.nextSibling
    );
  });
}
