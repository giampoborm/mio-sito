
import { requestIOSMotionPermission } from '../utils/iosPermission.js';

const COLORS = ["#FF0000", "#0000FF", "#FFFF00"];
const TILT_THRESHOLD = 20; // degrees; tweak as needed

function getRandomColor(exclude) {
  const available = COLORS.filter(c => c !== exclude);
  return available[Math.floor(Math.random() * available.length)];
}

function setupGyroColorSwitch(topDiv, bottomDiv, threshold = TILT_THRESHOLD) {
  let lastTop = null, lastBottom = null;
  let currentState = "none";

  function handleOrientation(event) {
    const { beta } = event;
    if (beta > threshold && currentState !== "top") {
      const color = getRandomColor(lastTop);
      topDiv.style.background = color;
      bottomDiv.style.background = "#fff";
      lastTop = color;
      currentState = "top";
    } else if (beta < -threshold && currentState !== "bottom") {
      const color = getRandomColor(lastBottom);
      bottomDiv.style.background = color;
      topDiv.style.background = "#fff";
      lastBottom = color;
      currentState = "bottom";
    } else if (beta >= -threshold && beta <= threshold && currentState !== "none") {
      topDiv.style.background = "#fff";
      bottomDiv.style.background = "#fff";
      currentState = "none";
    }
  }

  window.addEventListener("deviceorientation", handleOrientation, true);
  return () => window.removeEventListener("deviceorientation", handleOrientation, true);
}

export function renderHomepage(app) {
  app.innerHTML = "";

  const container = document.createElement("div");
  container.className = "home-split";

  // Top (who)
  const whoDiv = document.createElement("div");
  whoDiv.className = "home-side who-side";
  whoDiv.textContent = "who?";
  container.appendChild(whoDiv);

  // Bottom (what)
  const whatDiv = document.createElement("div");
  whatDiv.className = "home-side what-side";
  whatDiv.textContent = "what?";
  container.appendChild(whatDiv);

  app.appendChild(container);

  // Routing
  whoDiv.addEventListener("click", () => {
    history.pushState({}, "", "/who");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  whatDiv.addEventListener("click", () => {
    history.pushState({}, "", "/what");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  // Desktop hover logic
  let lastWhoColor = null, lastWhatColor = null;
  whoDiv.addEventListener("mouseenter", () => {
    if (window.innerWidth > 800) {
      const color = getRandomColor(lastWhoColor);
      whoDiv.style.background = color;
      lastWhoColor = color;
    }
  });
  whoDiv.addEventListener("mouseleave", () => {
    if (window.innerWidth > 800) whoDiv.style.background = "#fff";
  });
  whatDiv.addEventListener("mouseenter", () => {
    if (window.innerWidth > 800) {
      const color = getRandomColor(lastWhatColor);
      whatDiv.style.background = color;
      lastWhatColor = color;
    }
  });
  whatDiv.addEventListener("mouseleave", () => {
    if (window.innerWidth > 800) whatDiv.style.background = "#fff";
  });

  // Mobile: ask for motion permission first, then activate gyro logic
  let teardownGyro = null;
  if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    requestIOSMotionPermission(
      // enableOrientationCallback:
      () => {
        teardownGyro = setupGyroColorSwitch(whoDiv, whatDiv, TILT_THRESHOLD);
      },
      // fallbackCallback:
      () => {
        // No gyro: maybe show a message, or just leave colors static
        // Optionally: set both backgrounds to white for clarity
        whoDiv.style.background = "#fff";
        whatDiv.style.background = "#fff";
      }
    );
  }

  return () => {
    if (teardownGyro) teardownGyro();
    // Any further cleanup if needed
  };
}
