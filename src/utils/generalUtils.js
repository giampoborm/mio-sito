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

export function measureTextDimensions(text, className = '') {
  const temp = document.createElement('div');
  temp.textContent = text;

  // These styles are essential to keep it invisible and off-screen
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';

  // Apply the class(es) passed in. This is where ALL styling
  // for display, width, max-width, and wrapping will come from.
  if (className) {
    const classes = Array.isArray(className) ? className : String(className).split(' ');
    temp.classList.add(...classes);
  }

  document.body.appendChild(temp);
  const { width, height } = temp.getBoundingClientRect();
  document.body.removeChild(temp);
  
  return { width, height };
}

// And update the wrapper function to match
export async function measureTextDimensionsAfterFonts(text, className = '') { // Removed 'opts'
  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (e) {
    // ignore font readiness errors
  }
  return measureTextDimensions(text, className); // Pass only text and class
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
  return () => {
    observer.disconnect();
  };
}




export function loadAndMeasureImage(src, container, scale = 1, alt = '') {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.src = src;
    if (alt) {
      img.alt = alt;
    }
    img.style.position = 'absolute';
    // Hide the element until it has loaded and been sized to avoid a flash at
    // the top-left of the screen on mobile devices
    img.style.visibility = 'hidden';
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
      img.style.visibility = 'visible';
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
    // Prevent the video element from briefly appearing at the origin before
    // metadata loads and sizing/positioning occur.
    video.style.visibility = 'hidden';
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
      video.style.visibility = 'visible';
      resolve({ element: video, width: measuredW, height: measuredH });
    });
    
    video.addEventListener('error', (err) => {
      reject(err);
    });
  });
}

export function prefetchProjectAssets(projectDetails) {
  if (!projectDetails) return;

  const collectSources = (details) => {
    const srcs = [];
    if (details.sections) {
      details.sections.forEach((section) => {
        if (Array.isArray(section.elements)) {
          section.elements.forEach((item) => {
            if (item.type === 'image' || item.type === 'video') {
              srcs.push(item.src);
            }
          });
        }
      });
    } else if (Array.isArray(details.elements)) {
      details.elements.forEach((item) => {
        if (item.type === 'image' || item.type === 'video') {
          srcs.push(item.src);
        }
      });
    }
    return srcs;
  };

  const sources = collectSources(projectDetails);

  sources.forEach((src) => {
    const ext = src.split('.').pop().toLowerCase();
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = src;
      document.head.appendChild(link);
    } else {
      const img = new Image();
      img.src = src;
    }
  });
}

export function prefetchSummaryAssets(summary) {
  if (!summary || !Array.isArray(summary.elements)) return;

  summary.elements.forEach((item) => {
    if (!item.src) return;
    const ext = item.src.split('.').pop().toLowerCase();
    if (item.type === 'video' || ['mp4', 'webm', 'ogg', 'mov'].includes(ext)) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'video';
      link.href = item.src;
      document.head.appendChild(link);
    } else if (item.type === 'image') {
      const img = new Image();
      img.src = item.src;
    }
  });
}
