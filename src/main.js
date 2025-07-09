// src/main.js
import { initRouter } from './router.js';
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  initRouter(app);
});
