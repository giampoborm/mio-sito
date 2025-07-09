import Matter from 'matter-js';

export function spawnCenterText(world, container, text, options = {}) {
  const { tag = 'div', className = 'center-text' } = options;

  // Create your DOM element with the chosen tag
  const domElement = document.createElement(tag);
  domElement.textContent = text;

  // Optionally add a CSS class
  if (className) {
    domElement.classList.add(className);
  }

  // Position absolutely so we can sync with Matter.js
  domElement.style.position = 'absolute';
  domElement.style.userSelect = 'none';

  container.appendChild(domElement);

  // Now measure it so we can create a Matter body that matches its bounding box
  // (At first, it might be 0x0 until rendered; we can forcibly measure after a layout reflow)
  // However, typically you'd do a tiny "wait" or measure in the next frame. For simplicity:
  const { width, height } = domElement.getBoundingClientRect();

  // If it's 0 or extremely small, pick a fallback or measure again in setTimeout, etc.
  const bodyWidth = width || 50;
  const bodyHeight = height || 20;

  // Create a static rectangle body
  const body = Matter.Bodies.rectangle(
    window.innerWidth / 2,
    window.innerHeight / 2,
    bodyWidth,
    bodyHeight,
    { isStatic: true }
  );
  Matter.World.add(world, body);

  return { body, domElement };
}

// before it just console.logs; now we return!
export function analyzeTextAlignment(el) {
  const dom = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const font = `${style.fontSize} ${style.fontFamily}`;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const text = el.textContent.trim() || '?';
  const m = ctx.measureText(text);

  const fontBox       = m.fontBoundingBoxAscent  + m.fontBoundingBoxDescent;
  const glyphBox      = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const extraLeading  = dom.height - fontBox;
  const baselineOffset = (dom.height - glyphBox) / 2 + m.actualBoundingBoxAscent;
  const offsetFromCenter = baselineOffset - dom.height/2;

  return {
    domHeight:       dom.height,
    fontBox,
    glyphBox,
    extraLeading,
    baselineOffset,
    offsetFromCenter
  };
}


export function measureTextDimensions(text, className = '', { wrap = false } = {}) {
  const temp = document.createElement('div');
  temp.textContent     = text;
  temp.style.position  = 'absolute';
  temp.style.visibility= 'hidden';
  temp.style.display   = 'inline-block';     // 👈   important
  if (!wrap) temp.style.whiteSpace = 'nowrap';
  if (className) temp.classList.add(className);

  document.body.appendChild(temp);
  const { width, height } = temp.getBoundingClientRect();
  document.body.removeChild(temp);
  return { width, height };
}


// Attach visibility-based pause behaviour. The video will pause
// automatically when it leaves the viewport. No hover playback.
export function setupVideoPlayback(video) {
  const pause = () => video.pause();



  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) pause();
    });
  });
  observer.observe(video);
}




export function loadAndMeasureImage(src, container, scale = 1) {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.src = src;
    img.style.position = 'absolute';
    container.appendChild(img);
    img.addEventListener('load', () => {
      // Get natural dimensions
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;
      // Apply the scaling factor
      const scaledW = naturalW * scale;
      const scaledH = naturalH * scale;
      // Set the rendered size
      img.style.width = `${scaledW}px`;
      img.style.height = `${scaledH}px`;
      // After CSS is applied, measure the actual size
      const measuredW = img.offsetWidth;
      const measuredH = img.offsetHeight;
      resolve({ element: img, width: measuredW, height: measuredH });
    });
    img.addEventListener('error', (err) => reject(err));
  });
}

export function loadAndMeasureVideo(src, container, scale = 1) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = src;
    video.style.position = 'absolute';
    video.controls = true;
    container.appendChild(video);
    // Set up interactive playback behaviour
    setupVideoPlayback(video);
    
    video.addEventListener('loadedmetadata', () => {
      // Get natural dimensions
      const naturalW = video.videoWidth;
      const naturalH = video.videoHeight;
      
      // Apply scaling factor
      const scaledW = naturalW * scale;
      const scaledH = naturalH * scale;
      
      // Set the video's dimensions
      video.style.width = `${scaledW}px`;
      video.style.height = `${scaledH}px`;
      
      // Allow time for CSS to apply, then measure.
      const measuredW = video.offsetWidth;
      const measuredH = video.offsetHeight;
      
      resolve({ element: video, width: measuredW, height: measuredH });
    });
    
    video.addEventListener('error', (err) => {
      reject(err);
    });
  });
}

// Helper function (if not already in generalUtils.js)
export function createElementWithClass(tag, className) {
    const element = document.createElement(tag);
    element.className = className;
    return element;
}
