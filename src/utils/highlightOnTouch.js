import Matter from 'matter-js';
import { COLORS } from './colorSystem.js';

export function enableHighlightOnTouch(engine, bodies, options = {}) {
  const reactiveClass = options.reactiveClass || 'touch-reactive';
  const defaultColor = options.highlightColor || COLORS[0];

  const bodyToElement = new Map();
  const collisionCounts = new Map();
  const originalColors = new Map();

  bodies.forEach(({ body, domElement }) => {
    if (domElement) {
      bodyToElement.set(body.id, domElement);
      if (domElement.classList.contains(reactiveClass)) {
        originalColors.set(domElement, domElement.style.color || '');
      }
    }
  });

  const isTrigger = (body) => !body.isStatic;

  const handleStart = (event) => {
    event.pairs.forEach((pair) => {
      const elA = bodyToElement.get(pair.bodyA.id);
      const elB = bodyToElement.get(pair.bodyB.id);
      if (elA && elA.classList.contains(reactiveClass) && isTrigger(pair.bodyB)) {
        const c = (collisionCounts.get(elA) || 0) + 1;
        collisionCounts.set(elA, c);
        if (c === 1) {
          const color = elA.dataset.highlightColor || defaultColor;
          elA.style.color = color;
        }
      }
      if (elB && elB.classList.contains(reactiveClass) && isTrigger(pair.bodyA)) {
        const c = (collisionCounts.get(elB) || 0) + 1;
        collisionCounts.set(elB, c);
        if (c === 1) {
          const color = elB.dataset.highlightColor || defaultColor;
          elB.style.color = color;
        }
      }
    });
  };

  const handleEnd = (event) => {
    event.pairs.forEach((pair) => {
      const elA = bodyToElement.get(pair.bodyA.id);
      const elB = bodyToElement.get(pair.bodyB.id);
      if (elA && elA.classList.contains(reactiveClass) && isTrigger(pair.bodyB)) {
        const c = (collisionCounts.get(elA) || 0) - 1;
        if (c <= 0) {
          collisionCounts.delete(elA);
          if (elA.dataset.done === 'true') {
            elA.style.color = elA.dataset.highlightColor || defaultColor;
          } else {
            elA.style.color = originalColors.get(elA) || '#000';
          }
        } else {
          collisionCounts.set(elA, c);
        }
      }
      if (elB && elB.classList.contains(reactiveClass) && isTrigger(pair.bodyA)) {
        const c = (collisionCounts.get(elB) || 0) - 1;
        if (c <= 0) {
          collisionCounts.delete(elB);
          if (elB.dataset.done === 'true') {
            elB.style.color = elB.dataset.highlightColor || defaultColor;
          } else {
            elB.style.color = originalColors.get(elB) || '#000';
          }
        } else {
          collisionCounts.set(elB, c);
        }
      }
    });
  };

  Matter.Events.on(engine, 'collisionStart', handleStart);
  Matter.Events.on(engine, 'collisionEnd', handleEnd);

  return () => {
    Matter.Events.off(engine, 'collisionStart', handleStart);
    Matter.Events.off(engine, 'collisionEnd', handleEnd);
  };
}
