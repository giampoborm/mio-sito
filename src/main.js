// src/main.js
import { initRouter } from './router.js';
import './style.css';
import { initGlobalCursorHandlers } from './cursors.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  initRouter(app);
  initGlobalCursorHandlers();
});
