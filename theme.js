// Light / dark mode. Your choice is remembered on this device.
// This is a display setting only, stored apart from your workout data.
const THEME_KEY = "workoutTheme";

function savedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark"; // dark unless you chose light
  } catch (error) {
    return "dark";
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const bar = document.querySelector('meta[name="theme-color"]');
  if (bar) bar.content = theme === "dark" ? "#0f1115" : "#f4f5f7";
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (error) {
    // The look still changes; it just will not be remembered
  }
}

applyTheme(savedTheme()); // runs before the page is drawn, so there is no flash
