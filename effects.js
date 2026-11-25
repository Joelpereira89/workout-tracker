// Animations, celebrations and friendly "nothing here yet" screens.
// All animations are under half a second and are skipped if your device asks for reduced motion.

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Empty screens ---------- */

// Simple line drawings, 120 wide and 80 tall
const ILLUSTRATIONS = {
  dumbbell: "M30 40h60M40 22v36M80 22v36M30 30v20M90 30v20M20 70h80",
  calendar: "M30 18h60v52H30zM30 32h60M45 10v14M75 10v14M45 46h8M67 46h8M45 58h8M67 58h8",
  trophy: "M44 14h32v20a16 16 0 0 1-32 0zM44 20H30v4a14 14 0 0 0 14 14M76 20h14v4a14 14 0 0 1-14 14M60 50v14M44 68h32",
  chart: "M20 12v56h82M36 68V50M56 68V36M76 68V44M96 68V22"
};

function emptyState(art, text, buttonText, action, buttonIcon = "plus") {
  const box = make("div", "empty-state");
  const drawing = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  drawing.setAttribute("viewBox", "0 0 120 80");
  drawing.setAttribute("class", "illustration");
  drawing.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ILLUSTRATIONS[art]);
  drawing.append(path);

  const button = make("button", "accent", buttonText);
  button.type = "button";
  button.prepend(icon(buttonIcon));
  button.addEventListener("click", action);
  box.append(drawing, make("p", "", text), button);
  return box;
}

/* ---------- Dashboard animations ---------- */

let animationTimer = null;

// Charts grow in and summary numbers count up. Called when a screen is opened.
function animateScreen(panel) {
  if (reducedMotion()) return;
  panel.classList.add("animate");
  clearTimeout(animationTimer);
  animationTimer = setTimeout(() => document.querySelectorAll(".animate").forEach((el) => el.classList.remove("animate")), 480);
  countUp(panel);
}

function countUp(panel) {
  const numbers = [...panel.querySelectorAll(".stat-value")].map((el) => ({ el, end: Number(el.dataset.minutes) || 0 }));
  const started = performance.now();
  const duration = 400;
  const finish = () => numbers.forEach(({ el, end }) => { el.textContent = durationText(end); });
  const frame = (now) => {
    const part = Math.min(1, (now - started) / duration);
    if (part >= 1) return finish();
    numbers.forEach(({ el, end }) => { el.textContent = durationText(Math.round(end * part)); });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setTimeout(finish, duration + 50); // in case the screen was not being drawn
}

/* ---------- Confetti ---------- */

function confetti() {
  if (reducedMotion()) return;
  const box = make("div", "confetti");
  box.setAttribute("aria-hidden", "true");
  const colours = ["var(--accent)", "var(--success)", "var(--cardio)", "var(--mobility)", "var(--sport)"];
  for (let i = 0; i < 60; i++) {
    const piece = make("span");
    const angle = Math.random() * 2 * Math.PI;
    const distance = 80 + Math.random() * 180;
    piece.style.background = colours[i % colours.length];
    piece.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--y", `${Math.sin(angle) * distance}px`);
    piece.style.setProperty("--turn", `${Math.random() * 540}deg`);
    box.append(piece);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 500);
}
