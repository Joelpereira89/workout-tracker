// Starts the app and connects the buttons. Loaded last, after all the other files.

let data = loadData();

/* ---------- Tabs ---------- */

// Some screens live inside a tab: today's plan is in Log, the schedule is in Settings
const SCREEN_HOMES = { today: "log", library: "log", schedule: "settings", bests: "progress" };

function showTab(name) {
  const home = SCREEN_HOMES[name] || name;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === home));
  document.querySelectorAll(".panel").forEach((panel) => { panel.hidden = panel.id !== `tab-${home}`; });
  $("page-title").textContent = document.querySelector(`.tab[data-tab="${home}"]`).textContent;
  document.body.dataset.tab = home;
  if (home === "progress") renderProgress();
  if (home === "body") renderBody();
  if (home === "log") showLogView(name === "today" || name === "library" ? name : "log");
  if (home === "dashboard") {
    renderDashboard(); // always show the latest numbers
    animateScreen($("tab-dashboard"));
  }
  window.scrollTo(0, 0);
}

// Inside the Log tab: "log" (enter sets) or "today" (today's plan)
function showLogView(view) {
  $("view-log").hidden = view !== "log";
  $("view-today").hidden = view !== "today";
  $("view-library").hidden = view !== "library";
  document.body.dataset.view = view;
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("selected", button.dataset.view === view));
}

// Used by the floating button and the empty screens: go to Log and start the clock
function startWorkout() {
  showTab("log");
  if (!readTimer()) startTimer();
}

function renderAll() {
  renderLive();
  renderRoutines();
  renderLibrary();
  renderDashboard();
  renderToday();
  renderSchedule();
  renderHistory();
  renderProgress();
  renderBody();
}

// The light / dark button shows the mode you would switch to
function showThemeIcon() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("theme").replaceChildren(icon(dark ? "sun" : "moon"));
  $("theme").setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

/* ---------- Start the app ---------- */

// Put the icons on the buttons that are written in index.html
document.querySelectorAll("[data-icon]").forEach((el) => el.prepend(icon(el.dataset.icon)));
$("theme").addEventListener("click", () => { toggleTheme(); showThemeIcon(); });
showThemeIcon();

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => showLogView(button.dataset.view)));
$("fab").addEventListener("click", startWorkout);
document.querySelectorAll("[data-progress]").forEach((b) => b.addEventListener("click", () => { progressView = b.dataset.progress; renderProgress(); }));
$("exercise").addEventListener("change", showFormFields);
$("live-add").addEventListener("click", addChosenExercise);
$("live-discard").addEventListener("click", discardWorkout);
$("rest-skip").addEventListener("click", stopRest);
$("rest-less").addEventListener("click", () => changeRest(-15));
$("rest-more").addEventListener("click", () => changeRest(15));
// Hide the floating button while the keyboard is up, so it never covers a box
const isTypingBox = (el) => el.matches("textarea, input:not([type=checkbox]):not([type=file])");
document.addEventListener("focusin", (event) => document.body.classList.toggle("typing", isTypingBox(event.target)));
document.addEventListener("focusout", () => document.body.classList.remove("typing"));
$("workout-form").addEventListener("submit", saveWorkout);
$("add-exercise").addEventListener("click", addExercise);
$("new-exercise").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); addExercise(); }
});
$("add-set").addEventListener("click", () => {
  const last = $("sets").lastElementChild;
  addSetRow(last.querySelector(".reps").value, last.querySelector(".weight").value, last.querySelector(".set-type").value);
});
$("cancel-edit").addEventListener("click", () => { resetForm(); renderLive(); showTab("history"); });
$("export").addEventListener("click", exportData);
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", importData);
$("save-schedule").addEventListener("click", saveSchedule);
$("timer-start").addEventListener("click", startTimer);
$("timer-pause").addEventListener("click", pauseTimer);
$("timer-resume").addEventListener("click", resumeTimer);
$("timer-finish").addEventListener("click", finishTimer);
$("time-form").addEventListener("submit", saveManualTime);
$("time-date").value = today();
fillTypeList($("timer-type"));
fillTypeList($("time-type"));
$("timer-type").addEventListener("change", changeTimerType);
setInterval(updateClock, 1000);

// If you come back to the app on a new day, move on to that day
let openedOn = today();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) renderTimer();
  if (document.hidden || today() === openedOn) return;
  if ($("time-date").value === openedOn) $("time-date").value = today();
  if (!editingId && $("date").value === openedOn) $("date").value = today();
  openedOn = today();
  renderDashboard();
  renderToday();
  renderWeek();
});

// If the app is open in two browser tabs, keep them in step
window.addEventListener("storage", () => {
  storageProblem = false;
  data = loadData();
  live = readLive();
  fillExerciseList($("exercise").value);
  renderAll();
  renderTimer();
});

// Offline support. Only works from a web address, not from a double-clicked file.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

document.body.dataset.tab = "dashboard";
resetForm();
renderAll();
renderTimer();
renderRest();
animateScreen($("tab-dashboard"));
if (storageProblem) showMessage("Your saved data could not be read. It has not been changed. Import a backup to fix this.", true);
