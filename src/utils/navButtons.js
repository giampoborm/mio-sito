import Matter from 'matter-js';
import { measureTextDimensions } from './generalUtils.js';
import {
  getRandomColor,
  getNavHighlightColor,
  setNavHighlightColor
} from './colorSystem.js';
import projectsData from '../data/projects.json';

export function pickRandomPrimary(exclude = []) {
  return getRandomColor(exclude);
}

/**
 * Creates nav menu with tight Matter.js boxes and "against the wall" layout.
 * @param {Matter.World} world
 * @param {HTMLElement} container
 * @param {string} currentPage - '/', '/who', or '/what'
 * @returns {Array} for syncDOMWithBodies
 */
export function createPhysicsNavMenu(world, container, currentPage) {
  const navButtons = [
    { label: 'who?', path: '/who', id: 'who', type: 'link' },
    currentPage === '/what'
      ? { label: 'list', id: 'project-list', type: 'list' }
      : { label: '?', path: '/', id: 'home', type: 'link' },
    { label: 'what?', path: '/what', id: 'what', type: 'link' }
  ];

  if (!getNavHighlightColor()) {
    setNavHighlightColor(pickRandomPrimary());
  }
  const highlightColor = getNavHighlightColor();

  const bodies = [];
  const margin = 18; // Smallest gap from edge (adjust to taste)
  const y = 30;      // Vertically near the top

  const cleanupHandlers = Array.isArray(container.__navMenuCleanup)
    ? container.__navMenuCleanup
    : null;

  let dropdownEl = null;
  let dropdownButtons = [];
  let isDropdownOpen = false;
  let currentAnchor = null;
  let latestProjectIndex = 0;

  const highlightProjectInDropdown = (index) => {
    if (!dropdownButtons.length) return;
    dropdownButtons.forEach((button, idx) => {
      if (idx === index) {
        button.classList.add('is-active');
        button.setAttribute('aria-current', 'true');
      } else {
        button.classList.remove('is-active');
        button.removeAttribute('aria-current');
      }
    });
  };

  const closeDropdown = () => {
    if (!dropdownEl) return;
    dropdownEl.classList.remove('is-open');
    dropdownEl.setAttribute('aria-hidden', 'true');
    dropdownEl.style.display = 'none';
    if (currentAnchor) {
      currentAnchor.setAttribute('aria-expanded', 'false');
    }
    isDropdownOpen = false;
  };

  const updateDropdownPosition = () => {
    if (!dropdownEl || !currentAnchor) return;
    const rect = currentAnchor.getBoundingClientRect();
    dropdownEl.style.left = `${rect.left + rect.width / 2}px`;
    dropdownEl.style.top = `${rect.bottom + 12}px`;
    dropdownEl.style.minWidth = `${rect.width}px`;
  };

  const handleProjectChange = (event) => {
    const { index } = event.detail || {};
    if (typeof index === 'number') {
      latestProjectIndex = index;
      highlightProjectInDropdown(index);
      closeDropdown();
    }
  };

  window.addEventListener('whatProjectChanged', handleProjectChange);
  cleanupHandlers?.push(() => {
    window.removeEventListener('whatProjectChanged', handleProjectChange);
  });

  const ensureDropdown = () => {
    if (dropdownEl || currentPage !== '/what') return;

    dropdownEl = document.createElement('div');
    dropdownEl.className = 'project-dropdown';
    dropdownEl.setAttribute('role', 'menu');
    dropdownEl.setAttribute('aria-hidden', 'true');
    dropdownEl.style.position = 'fixed';
    dropdownEl.style.transform = 'translateX(-50%)';
    dropdownEl.style.display = 'none';

    const listEl = document.createElement('ul');
    listEl.className = 'project-dropdown-list';
    dropdownEl.appendChild(listEl);

    dropdownButtons = projectsData.projects.map((project, index) => {
      const itemEl = document.createElement('li');
      itemEl.className = 'project-dropdown-item';

      const buttonEl = document.createElement('button');
      buttonEl.type = 'button';
      buttonEl.textContent = project.title;
      buttonEl.className = 'project-dropdown-button';
      buttonEl.addEventListener('click', (event) => {
        event.stopPropagation();
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('whatProjectListSelect', {
          detail: { index }
        }));
        closeDropdown();
      });
      buttonEl.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });

      itemEl.appendChild(buttonEl);
      listEl.appendChild(itemEl);
      return buttonEl;
    });

    dropdownEl.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    container.appendChild(dropdownEl);

    const handleOutsidePointer = (event) => {
      if (!dropdownEl || !isDropdownOpen) return;
      if (dropdownEl.contains(event.target) || (currentAnchor && currentAnchor.contains(event.target))) {
        return;
      }
      closeDropdown();
    };

    window.addEventListener('pointerdown', handleOutsidePointer);
    cleanupHandlers?.push(() => {
      window.removeEventListener('pointerdown', handleOutsidePointer);
    });

    const handleResize = () => {
      if (!isDropdownOpen) return;
      updateDropdownPosition();
    };

    window.addEventListener('resize', handleResize);
    cleanupHandlers?.push(() => {
      window.removeEventListener('resize', handleResize);
    });

    highlightProjectInDropdown(latestProjectIndex);
  };

  navButtons.forEach((btn, index) => {
    const { width, height } = measureTextDimensions(btn.label, 'nav-button');

    let x;
    if (index === 0) {
      x = margin + width / 2;
    } else if (index === 1) {
      x = window.innerWidth / 2;
    } else if (index === 2) {
      x = window.innerWidth - margin - width / 2;
    }

    const el = document.createElement('div');
    el.textContent = btn.label;
    el.className = 'nav-button';
    el.style.position = 'absolute';
    el.style.fontFamily = 'inherit';
    el.style.userSelect = 'none';
    el.style.background = 'transparent';

    const isActive =
      btn.type === 'link' && (
        (currentPage === '/' && btn.id === 'home') ||
        (currentPage === '/who' && btn.id === 'who') ||
        (currentPage === '/what' && btn.id === 'what')
      );

    if (isActive) {
      el.style.color = highlightColor;
      el.style.textDecoration = 'none';
    } else {
      el.style.color = '#000';
      el.addEventListener('mouseenter', () => {
        const other = navButtons.find(nb => nb.id !== btn.id && nb.el && nb.el.dataset.currentColor);
        const exclude = [highlightColor];
        if (other && other.el.dataset.currentColor) exclude.push(other.el.dataset.currentColor);
        const c = getRandomColor(exclude);
        el.style.color = c;
        el.dataset.currentColor = c;
      });
      el.addEventListener('mouseleave', () => {
        el.style.color = '#000';
        el.dataset.currentColor = '';
      });
    }

    btn.el = el;

    if (btn.type === 'link') {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.path && window.location.pathname !== btn.path) {
          const color = el.dataset.currentColor || getRandomColor([highlightColor]);
          setNavHighlightColor(color);
          history.pushState({}, '', btn.path);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      });
    } else if (btn.type === 'list') {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-haspopup', 'true');
      el.setAttribute('aria-expanded', 'false');
      el.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      const toggleDropdown = () => {
        ensureDropdown();
        if (!dropdownEl) return;
        if (isDropdownOpen) {
          closeDropdown();
        } else {
          currentAnchor = el;
          updateDropdownPosition();
          dropdownEl.style.display = 'block';
          dropdownEl.classList.add('is-open');
          dropdownEl.setAttribute('aria-hidden', 'false');
          el.setAttribute('aria-expanded', 'true');
          isDropdownOpen = true;
        }
      };
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleDropdown();
      });
      el.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleDropdown();
        }
      });
    }

    container.appendChild(el);

    const body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: true
    });
    Matter.World.add(world, body);
    bodies.push({ body, domElement: el });
  });

  return bodies;
}
