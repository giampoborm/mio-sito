import Matter from 'matter-js';
import {
  initializeMatterEngine,
  createViewportBoundaries,
  syncDOMWithBodies,
  enableDragging,
  isMobile,
  enableDeviceGravity,
  setGravity,
  handleResize,
} from './physicsSetup.js';
import { loadAndMeasureImage } from '../utils/generalUtils.js';
import { createPhysicsNavMenu } from '../utils/navButtons.js';

// Example asset imports
import headPath from '../assets/who/head.png';
import torsoPath from '../assets/who/torso.png';
import leftUpperArmPath from '../assets/who/leftUpperArm.png';
import leftLowerArmPath from '../assets/who/leftLowerArm.png';
import rightUpperArmPath from '../assets/who/rightUpperArm.png';
import rightLowerArmPath from '../assets/who/rightLowerArm.png';
import leftUpperLegPath from '../assets/who/leftUpperLeg.png';
import leftLowerLegPath from '../assets/who/leftLowerLeg.png';
import rightUpperLegPath from '../assets/who/rightUpperLeg.png';
import rightLowerLegPath from '../assets/who/rightLowerLeg.png';

function addContactLinks(world, container, bodies, spawnX, spawnY) {
  // Create Instagram link element
  const instaLink = document.createElement('a');
  instaLink.classList.add('contact-dynamic-link'); // Style in CSS
  instaLink.textContent = 'my instagram';
  instaLink.href = 'https://www.instagram.com/giampogonzalez'; // Replace with your actual handle
  instaLink.target = '_blank';
  container.appendChild(instaLink);
  const instaRect = instaLink.getBoundingClientRect();
  // Position relative to the spawn point: a bit to the left
  const instaX = spawnX - instaRect.width - 10;
  const instaY = spawnY;
  const instaBody = Matter.Bodies.rectangle(
    instaX,
    instaY,
    instaRect.width,
    instaRect.height,
    { isStatic: false }
  );
  Matter.World.add(world, instaBody);
  bodies.push({ body: instaBody, domElement: instaLink });

  // Create Email link element
  const emailLink = document.createElement('a');
  emailLink.classList.add('contact-dynamic-link');
  emailLink.textContent = 'send me an email';
  emailLink.href = 'mailto:giampobo@gmail.com';
  container.appendChild(emailLink);
  const emailRect = emailLink.getBoundingClientRect();
  // Position relative to the spawn point: a bit to the right
  const emailX = spawnX + 10;
  const emailY = spawnY;
  const emailBody = Matter.Bodies.rectangle(
    emailX,
    emailY,
    emailRect.width,
    emailRect.height,
    { isStatic: false }
  );
  Matter.World.add(world, emailBody);
  bodies.push({ body: emailBody, domElement: emailLink });
}

function addWhoTexts(world, container, bodies) {

  const isMobile = window.innerWidth <= 768;

  let scrollWrapper;
  if (isMobile) {
    scrollWrapper = document.createElement('div');
    scrollWrapper.id = 'who-text-scroll-wrapper';
    container.appendChild(scrollWrapper);
  }

  const isOnMobile = window.innerWidth <= 768; // or use your existing isMobile()

  const baseX = isOnMobile 
    ? 20         // center text on mobile
    : window.innerWidth * 0.60;     // keep right side on desktop

  let currentY = isOnMobile 
    ? window.innerHeight * 0.55     // start text below puppet
    : window.innerHeight * 0.25;    // keep top section on desktop

  // === 1) TITLE BLOCK ===
  const titleEl = document.createElement('h1');
  titleEl.classList.add('who-title');
  titleEl.textContent = 'gianpaolo bormioli';

  const target = isMobile ? scrollWrapper : container;
  target.appendChild(titleEl);
  const titleRect = titleEl.getBoundingClientRect();
  // Place the title so its center matches (baseX, currentY + half its height)
  const titleX = baseX + (titleRect.width / 2);
  const titleY = currentY + (titleRect.height / 2);

  const titleBody = Matter.Bodies.rectangle(
    titleX,
    titleY,
    titleRect.width,
    titleRect.height,
    { isStatic: true }
  );
  Matter.World.add(world, titleBody);
  bodies.push({ body: titleBody, domElement: titleEl });

  // Add some vertical spacing below the title
  currentY += titleRect.height + (isOnMobile ? 50 : 100);

// === 2) FIRST PARAGRAPH BLOCK ===
const firstParaEl = document.createElement('p');
firstParaEl.classList.add('who-paragraph');
// Use innerHTML so we can insert markup into the text.
firstParaEl.innerHTML = 
  `In other words: me.
A designer is a quick and easy way to define what I do. A storyteller is a more flattering and poetic one. Anyone who’s had the arguable luck of spending more than five minutes with me can vouch for my tendency to narrate endless stories, down to the smallest details, with the bright enthusiasm of friends who’ve already heard them a thousand times. This habit naturally shaped the way I experience things, as potential stories.
Thanks to my beloved mother, who always made me tidy my room (not always successfully), I developed an acute attention to detail—if anything, just to pair it with a dose of merciless and indiscriminate (self)criticism. A perfect mix for storytelling, very humbly. Creativity serves the same purpose, providing the how, which medium, which tool, which software?
Shamelessly following the zeitgeist, I make my own kefir, buy nice coffee beans and am way too familiar around natural wineries. A sensitive young man, some might say. I read, worked, ate, drank, traveled, and enjoyed all of it for one reason: to stock pieces of life that allow me to better tell stories. My focus is on telling them, but I’m also an avid consumer of others' stories.
<span class="contact-link">Tell me yours.</span>`;

target.appendChild(firstParaEl);
const firstParaRect = firstParaEl.getBoundingClientRect();

const firstParaX = baseX + (firstParaRect.width / 2);
const firstParaY = currentY + (firstParaRect.height / 2);

const firstParaBody = Matter.Bodies.rectangle(
  firstParaX,
  firstParaY,
  firstParaRect.width,
  firstParaRect.height,
  { isStatic: true }
);
Matter.World.add(world, firstParaBody);
bodies.push({ body: firstParaBody, domElement: firstParaEl });

  // --- Attach event to the clickable text ---
  const contactLink = firstParaEl.querySelector('.contact-link');
  let linksSpawned = false;
  contactLink.addEventListener('click', (event) => {
    if (!linksSpawned) {
      // Capture the cursor position from the event.
      const spawnX = event.clientX;
      const spawnY = event.clientY;
      // Now spawn the dynamic links at the cursor's position.
      addContactLinks(world, container, bodies, spawnX, spawnY);
      linksSpawned = true;
    }
  });


  // Add spacing below the first paragraph
  currentY += firstParaRect.height + (isOnMobile ? 20 : 40);


  // === 3) SECOND PARAGRAPH BLOCK ===
  const secondParaEl = document.createElement('p');
  secondParaEl.classList.add('who-paragraph');
  secondParaEl.textContent = 
    `On a practical level, I work with communication—visual, digital, analog. I do graphics (print & digital), videos, animations, websites, and more experimental things (see the *what?* page). I can print, cut, bind, and sew. I can write and direct too.
I wish I could say I can sing, but that would be a lie. Big fan of karaoke, though.`;
  target.appendChild(secondParaEl);
  const secondParaRect = secondParaEl.getBoundingClientRect();

  const secondParaX = baseX + (secondParaRect.width / 2);
  const secondParaY = currentY + (secondParaRect.height / 2);

  const secondParaBody = Matter.Bodies.rectangle(
    secondParaX,
    secondParaY,
    secondParaRect.width,
    secondParaRect.height,
    { isStatic: true }
  );
  Matter.World.add(world, secondParaBody);
  bodies.push({ body: secondParaBody, domElement: secondParaEl });
}

/**
 * Creates a ragdoll composite using measured PNG data,
 * ensuring arms have short constraints by placing them
 * physically at the torso's shoulders from the start.
 */
function createRagdoll(x, y, scale, loadedData) {
  const {
    headData,
    torsoData,
    leftUpperArmData,
    leftLowerArmData,
    rightUpperArmData,
    rightLowerArmData,
    leftUpperLegData,
    leftLowerLegData,
    rightUpperLegData,
    rightLowerLegData,
  } = loadedData;

  // Basic dimensions
  const headRadius = (headData.width * scale) / 2;
  const torsoW = torsoData.width * scale;
  const torsoH = torsoData.height * scale;

  // TORSO
  const torsoBody = Matter.Bodies.rectangle(
    x,
    y,
    torsoW,
    torsoH,
    { label: 'torso', chamfer: { radius: 10 * scale } }
  );

  // HEAD: place so its bottom touches torso's top
  const headBody = Matter.Bodies.circle(
    x,
    y - torsoH / 2 - headRadius,
    headRadius,
    { label: 'head' }
  );

  // ARMS
  // We place each upper arm so that its top anchor point
  // exactly overlaps the torso's shoulder coordinate.
  const luaW = leftUpperArmData.width * scale;
  const luaH = leftUpperArmData.height * scale;
  const llaW = leftLowerArmData.width * scale;
  const llaH = leftLowerArmData.height * scale;

  // LEFT UPPER ARM: place center so top is at (x - torsoW/2, y - torsoH/4)
  const leftShoulderX = x - torsoW / 2;
  const leftShoulderY = y - torsoH / 4;
  const leftUpperArmBody = Matter.Bodies.rectangle(
    leftShoulderX,
    leftShoulderY + luaH / 2, // offset by half its height so top aligns
    luaW,
    luaH,
    { label: 'leftUpperArm', chamfer: { radius: 5 * scale } }
  );
  // LEFT LOWER ARM: place so top aligns with bottom of upper arm
  const leftLowerArmBody = Matter.Bodies.rectangle(
    leftShoulderX,
    (leftShoulderY + luaH / 2) + luaH / 2 + llaH / 2, 
    llaW,
    llaH,
    { label: 'leftLowerArm', chamfer: { radius: 5 * scale } }
  );

  // RIGHT ARMS
  const ruaW = rightUpperArmData.width * scale;
  const ruaH = rightUpperArmData.height * scale;
  const rlaW = rightLowerArmData.width * scale;
  const rlaH = rightLowerArmData.height * scale;

  const rightShoulderX = x + torsoW / 2;
  const rightShoulderY = y - torsoH / 4;
  const rightUpperArmBody = Matter.Bodies.rectangle(
    rightShoulderX,
    rightShoulderY + ruaH / 2,
    ruaW,
    ruaH,
    { label: 'rightUpperArm', chamfer: { radius: 5 * scale } }
  );
  const rightLowerArmBody = Matter.Bodies.rectangle(
    rightShoulderX,
    (rightShoulderY + ruaH / 2) + ruaH / 2 + rlaH / 2,
    rlaW,
    rlaH,
    { label: 'rightLowerArm', chamfer: { radius: 5 * scale } }
  );

  // LEGS
  // Same approach: place them so the top of each leg is exactly at the torso's bottom corners.
  const lulW = leftUpperLegData.width * scale;
  const lulH = leftUpperLegData.height * scale;
  const lllW = leftLowerLegData.width * scale;
  const lllH = leftLowerLegData.height * scale;

  // Left hip
  const leftHipX = x - torsoW / 4;
  const leftHipY = y + torsoH / 2;
  const leftUpperLegBody = Matter.Bodies.rectangle(
    leftHipX,
    leftHipY + lulH / 2,
    lulW,
    lulH,
    { label: 'leftUpperLeg', chamfer: { radius: 5 * scale } }
  );
  const leftLowerLegBody = Matter.Bodies.rectangle(
    leftHipX,
    leftHipY + lulH + lllH / 2,
    lllW,
    lllH,
    { label: 'leftLowerLeg', chamfer: { radius: 5 * scale } }
  );

  // Right hip
  const rulW = rightUpperLegData.width * scale;
  const rulH = rightUpperLegData.height * scale;
  const rllW = rightLowerLegData.width * scale;
  const rllH = rightLowerLegData.height * scale;

  const rightHipX = x + torsoW / 4;
  const rightHipY = y + torsoH / 2;
  const rightUpperLegBody = Matter.Bodies.rectangle(
    rightHipX,
    rightHipY + rulH / 2,
    rulW,
    rulH,
    { label: 'rightUpperLeg', chamfer: { radius: 5 * scale } }
  );
  const rightLowerLegBody = Matter.Bodies.rectangle(
    rightHipX,
    rightHipY + rulH + rllH / 2,
    rllW,
    rllH,
    { label: 'rightLowerLeg', chamfer: { radius: 5 * scale } }
  );

  // CONSTRAINTS
  // We do NOT specify 'length', so the rest length is the initial distance between pointA & pointB.
  // Because we physically placed them so they overlap at the joint, the rest length is near zero.
  // We set stiffness high (0.9) to keep them from floating out.
  const stiffConstraint = { stiffness: 0.6 };
  const constraints = [];

  // Neck
  constraints.push(Matter.Constraint.create({
    bodyA: headBody,
    pointA: { x: 0, y: headRadius },
    bodyB: torsoBody,
    pointB: { x: 0, y: -torsoH / 2 },
    ...stiffConstraint,
  }));

  // LEFT SHOULDER
  constraints.push(Matter.Constraint.create({
    bodyA: torsoBody,
    pointA: { x: -torsoW / 2, y: -torsoH / 4 },
    bodyB: leftUpperArmBody,
    pointB: { x: 0, y: -luaH / 2 },
    ...stiffConstraint,
  }));
  // LEFT ELBOW
  constraints.push(Matter.Constraint.create({
    bodyA: leftUpperArmBody,
    pointA: { x: 0, y: luaH / 2 },
    bodyB: leftLowerArmBody,
    pointB: { x: 0, y: -llaH / 2 },
    ...stiffConstraint,
  }));

  // RIGHT SHOULDER
  constraints.push(Matter.Constraint.create({
    bodyA: torsoBody,
    pointA: { x: torsoW / 2, y: -torsoH / 4 },
    bodyB: rightUpperArmBody,
    pointB: { x: 0, y: -ruaH / 2 },
    ...stiffConstraint,
  }));
  // RIGHT ELBOW
  constraints.push(Matter.Constraint.create({
    bodyA: rightUpperArmBody,
    pointA: { x: 0, y: ruaH / 2 },
    bodyB: rightLowerArmBody,
    pointB: { x: 0, y: -rlaH / 2 },
    ...stiffConstraint,
  }));

  // LEFT HIP
  constraints.push(Matter.Constraint.create({
    bodyA: torsoBody,
    pointA: { x: -torsoW / 4, y: torsoH / 2 },
    bodyB: leftUpperLegBody,
    pointB: { x: 0, y: -lulH / 2 },
    ...stiffConstraint,
  }));
  // LEFT KNEE
  constraints.push(Matter.Constraint.create({
    bodyA: leftUpperLegBody,
    pointA: { x: 0, y: lulH / 2 },
    bodyB: leftLowerLegBody,
    pointB: { x: 0, y: -lllH / 2 },
    ...stiffConstraint,
  }));

  // RIGHT HIP
  constraints.push(Matter.Constraint.create({
    bodyA: torsoBody,
    pointA: { x: torsoW / 4, y: torsoH / 2 },
    bodyB: rightUpperLegBody,
    pointB: { x: 0, y: -rulH / 2 },
    ...stiffConstraint,
  }));
  // RIGHT KNEE
  constraints.push(Matter.Constraint.create({
    bodyA: rightUpperLegBody,
    pointA: { x: 0, y: rulH / 2 },
    bodyB: rightLowerLegBody,
    pointB: { x: 0, y: -rllH / 2 },
    ...stiffConstraint,
  }));

  // Assemble composite
  const ragdoll = Matter.Composite.create({ label: 'ragdoll' });
  Matter.Composite.add(ragdoll, [
    headBody,
    torsoBody,
    leftUpperArmBody,
    leftLowerArmBody,
    rightUpperArmBody,
    rightLowerArmBody,
    leftUpperLegBody,
    leftLowerLegBody,
    rightUpperLegBody,
    rightLowerLegBody,
  ]);
  constraints.forEach(c => Matter.Composite.add(ragdoll, c));

  // Return mapping for DOM sync
  const partsMap = {
    head: headBody,
    torso: torsoBody,
    leftUpperArm: leftUpperArmBody,
    leftLowerArm: leftLowerArmBody,
    rightUpperArm: rightUpperArmBody,
    rightLowerArm: rightLowerArmBody,
    leftUpperLeg: leftUpperLegBody,
    leftLowerLeg: leftLowerLegBody,
    rightUpperLeg: rightUpperLegBody,
    rightLowerLeg: rightLowerLegBody,
  };

  return { composite: ragdoll, partsMap };
}

export function setupWhoPhysics() {
  // 1) Initialize engine and world
  const engine = initializeMatterEngine();
  const world = engine.world;

  // 2) Setup gravity + boundaries
  if (isMobile()) {
    enableDeviceGravity(engine);
  } else {
    setGravity(engine, 0, 1); // or whatever default gravity
  }
  const boundaries = createViewportBoundaries(world);
  const cleanupResize = handleResize(boundaries, world);

  // 3) Create container
  const container = document.createElement('div');
  container.id = 'container';
  document.body.appendChild(container);

  const bodies = [];

  // 4) Navigation menu
  const navBodies = createPhysicsNavMenu(world, container, '/who');
  bodies.push(...navBodies);

  // 5) Text blocks (title and two paragraphs)
  addWhoTexts(world, container, bodies);


  // 6) Load assets for the ragdoll (unchanged from previous code)
  const scaleFactor = 1; // Tweak as needed
  Promise.all([
    loadAndMeasureImage(headPath, container, scaleFactor),
    loadAndMeasureImage(torsoPath, container, scaleFactor),
    loadAndMeasureImage(leftUpperArmPath, container, scaleFactor),
    loadAndMeasureImage(leftLowerArmPath, container, scaleFactor),
    loadAndMeasureImage(rightUpperArmPath, container, scaleFactor),
    loadAndMeasureImage(rightLowerArmPath, container, scaleFactor),
    loadAndMeasureImage(leftUpperLegPath, container, scaleFactor),
    loadAndMeasureImage(leftLowerLegPath, container, scaleFactor),
    loadAndMeasureImage(rightUpperLegPath, container, scaleFactor),
    loadAndMeasureImage(rightLowerLegPath, container, scaleFactor),
  ])
    .then(([
      headData,
      torsoData,
      leftUpperArmData,
      leftLowerArmData,
      rightUpperArmData,
      rightLowerArmData,
      leftUpperLegData,
      leftLowerLegData,
      rightUpperLegData,
      rightLowerLegData,
    ]) => {
      const loadedData = {
        headData,
        torsoData,
        leftUpperArmData,
        leftLowerArmData,
        rightUpperArmData,
        rightLowerArmData,
        leftUpperLegData,
        leftLowerLegData,
        rightUpperLegData,
        rightLowerLegData,
      };

      // 7) Create the ragdoll with the loaded assets
      const isMobile = window.innerWidth <= 768;
      const ragdollX = isMobile 
        ? window.innerWidth / 2 
        : window.innerWidth / 4;
      
      const ragdollY = isMobile 
        ? window.innerHeight * 0.3  // higher spawn
        : window.innerHeight * 0.5;
      
      const { composite, partsMap } = createRagdoll(ragdollX, ragdollY, scaleFactor, loadedData);
      Matter.World.addComposite(world, composite);

      // 8) Pair each body with its corresponding DOM element for sync
      const partNames = [
        'head',
        'torso',
        'leftUpperArm',
        'leftLowerArm',
        'rightUpperArm',
        'rightLowerArm',
        'leftUpperLeg',
        'leftLowerLeg',
        'rightUpperLeg',
        'rightLowerLeg',
      ];
      partNames.forEach(part => {
        bodies.push({
          body: partsMap[part],
          domElement: loadedData[`${part}Data`].element,
        });
      });

      enableDragging(engine, world, container);
      syncDOMWithBodies(bodies, container);
    })
    .catch(err => console.error('Error loading images:', err));

    
if (isMobile()) {
  // We allow scrolling on mobile, so let's keep the static bodies in sync.
  window.addEventListener('scroll', () => {
    bodies.forEach(({ body, domElement }) => {
      // Only reposition if it's a static body representing a text block
      if (body.isStatic) {
        const rect = domElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        Matter.Body.setPosition(body, { x: centerX, y: centerY });
      }
    });
  });
}

  // 9) Optional debug wireframe
  const render = Matter.Render.create({
    element: container,
    engine: engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: true,
    },
  });
  Matter.Render.run(render);

  // 10) Run the engine
  const runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  // Return teardown function
  return function teardownWhoPhysics() {
    Matter.Runner.stop(runner);
    Matter.World.clear(world, false);
    Matter.Engine.clear(engine);
    if (container.parentNode) container.parentNode.removeChild(container);
    if (cleanupResize) cleanupResize();
  };
}
