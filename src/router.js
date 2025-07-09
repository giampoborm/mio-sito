// src/router.js
let currentTeardown = null;

export async function handleRoute(app) {
  // Teardown previous page if needed
  if (currentTeardown) {
    currentTeardown();
    currentTeardown = null;
  }

  // Normalize pathname
  const path = window.location.pathname.replace(/\/+$/, '') || '/';

  switch (path) {
    case '/':
    case '/home': {
      const { renderHomepage } = await import('./pages/homepage.js');
      currentTeardown = renderHomepage(app);
      break;
    }
    case '/what': {
      const { renderWhatpage } = await import('./pages/whatpage.js');
      currentTeardown = renderWhatpage(app);
      break;
    }
    case '/who': {
      const { renderWhopage } = await import('./pages/whopage.js');
      currentTeardown = renderWhopage(app);
      break;
    }
    // Add more cases for extra pages if/when needed
    default: {
      app.innerHTML = '<h2>404: Page Not Found</h2>';
    }
  }
}

export function initRouter(app) {
  handleRoute(app);
  window.addEventListener('popstate', () => handleRoute(app));
  document.addEventListener('click', (event) => {
    // Internal navigation hijack
    if (event.target.tagName === 'A' && event.target.href.startsWith(window.location.origin)) {
      event.preventDefault();
      history.pushState({}, '', event.target.getAttribute('href'));
      handleRoute(app);
    }
  });
}
