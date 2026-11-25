// Workout Tracker: all the behaviour of the app.
// Your data is saved in this browser's local storage under the name below.
const STORAGE_KEY = "workoutTracker";

// Exercises that match the equipment in your gym.
const DEFAULT_EXERCISES = {
  "Chest": ["Bench Press", "Machine Chest Press", "Dumbbell Bench Press", "Incline Dumbbell Press", "Dumbbell Fly", "Cable Chest Fly"],
  "Back": ["Lat Pulldown", "Seated Row", "Barbell Row", "Dumbbell Row", "Deadlift", "Back Extension"],
  "Legs": ["Squat", "Leg Press", "Dumbbell Lunges", "Romanian Deadlift", "Inner Thigh Machine", "Outer Thigh Machine"],
  "Shoulders": ["Overhead Press", "Dumbbell Shoulder Press", "Cable Shoulder Press", "Dumbbell Lateral Raise", "Cable Lateral Raise"],
  "Arms": ["Preacher Curl", "Dumbbell Bicep Curl", "Cable Bicep Curl", "Triceps Pushdown", "Dumbbell Triceps Extension"],
  "Core": ["Ab Crunch Machine"]
};

const $ = (id) => document.getElementById(id);

let storageProblem = false; // true if saved data cannot be read safely
let data = loadData();
let editingId = null;       // set while you are editing an old entry
let messageTimer = null;

/* ---------- Saving and loading ---------- */

function emptyData() {
  return { version: 1, customExercises: [], entries: [] };
}

// Checks that data (from storage or from a backup file) has the right shape.
function cleanData(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries) || !Array.isArray(raw.customExercises)) {
    throw new Error("Not workout tracker data");
  }
  const isSet = (s) => s && Number.isInteger(s.reps) && s.reps > 0 && Number.isFinite(s.weight) && s.weight >= 0;
  const isEntry = (e) => e && typeof e.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.exercise === "string" && e.exercise && Array.isArray(e.sets) && e.sets.length && e.sets.every(isSet);

  if (!raw.entries.every(isEntry) || !raw.customExercises.every((n) => typeof n === "string")) {
    throw new Error("Some of the data is damaged");
  }
  return {
    version: 1,
    customExercises: raw.customExercises,
    entries: raw.entries.map((e) => ({ ...e, notes: typeof e.notes === "string" ? e.notes : "" }))
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? cleanData(JSON.parse(saved)) : emptyData();
  } catch (error) {
    storageProblem = true;
    return emptyData();
  }
}

// Returns true only if the data was really saved.
function saveData(newData) {
  if (storageProblem) {
    showMessage("Your saved data could not be read, so nothing was changed. Import a backup to fix this.", true);
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  } catch (error) {
    showMessage("Could not save. Your browser may be blocking storage or be full.", true);
    return false;
  }
  data = newData;
  return true;
}

/* ---------- Small helpers ---------- */

function showMessage(text, isError) {
  const box = $("message");
  box.textContent = text;
  box.classList.toggle("error", Boolean(isError));
  box.hidden = false;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { box.hidden = true; }, isError ? 6000 : 3000);
}

// Today's date in your own time zone, as YYYY-MM-DD.
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function niceDate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

// Creates a page element. Text is added safely, never treated as code.
function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function weightLabel(weight) {
  return weight === 0 ? "Bodyweight" : `${weight} lbs`;
}

/* ---------- Tabs ---------- */

function showTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  document.querySelectorAll(".panel").forEach((panel) => { panel.hidden = panel.id !== `tab-${name}`; });
  window.scrollTo(0, 0);
}

/* ---------- Log form ---------- */

function allExerciseNames() {
  return Object.values(DEFAULT_EXERCISES).flat().concat(data.customExercises);
}

function fillExerciseList(selected) {
  const list = $("exercise");
  list.textContent = "";
  list.append(new Option("Choose an exercise…", ""));

  const groups = { ...DEFAULT_EXERCISES };
  // Names you added, plus any name used in history that is no longer listed
  const known = new Set(Object.values(DEFAULT_EXERCISES).flat());
  const mine = new Set(data.customExercises.concat(data.entries.map((e) => e.exercise)).filter((n) => !known.has(n)));
  if (mine.size) groups["My exercises"] = [...mine].sort((a, b) => a.localeCompare(b));

  for (const [groupName, names] of Object.entries(groups)) {
    const group = document.createElement("optgroup");
    group.label = groupName;
    names.forEach((name) => group.append(new Option(name, name)));
    list.append(group);
  }
  list.value = selected || "";
}

function addExercise() {
  const input = $("new-exercise");
  const name = input.value.trim();
  if (!name) return showMessage("Type the exercise name first.", true);

  const existing = allExerciseNames().find((n) => n.toLowerCase() === name.toLowerCase());
  if (!existing && !saveData({ ...data, customExercises: [...data.customExercises, name] })) return;

  fillExerciseList(existing || name);
  input.value = "";
  showMessage(existing ? "That exercise is already in the list, so I selected it." : `Added "${name}".`);
}

function addSetRow(reps = "", weight = "") {
  const row = make("div", "set-row");
  const number = make("span", "set-number");

  const repsInput = make("input", "reps");
  Object.assign(repsInput, { type: "number", inputMode: "numeric", min: "1", step: "1", value: reps });
  repsInput.setAttribute("aria-label", "Reps");

  const weightInput = make("input", "weight");
  Object.assign(weightInput, { type: "number", inputMode: "decimal", min: "0", step: "any", value: weight });
  weightInput.setAttribute("aria-label", "Weight in lbs");

  const remove = make("button", "danger", "✕");
  remove.type = "button";
  remove.setAttribute("aria-label", "Remove set");
  remove.addEventListener("click", () => {
    row.remove();
    if (!$("sets").children.length) addSetRow();
    numberSets();
  });

  row.append(number, repsInput, weightInput, remove);
  $("sets").append(row);
  numberSets();
}

function numberSets() {
  [...$("sets").children].forEach((row, i) => { row.querySelector(".set-number").textContent = i + 1; });
}

function resetForm() {
  editingId = null;
  $("form-title").textContent = "Log a workout";
  $("save").textContent = "Save Workout";
  $("cancel-edit").hidden = true;
  $("date").value = today();
  $("notes").value = "";
  $("new-exercise").value = "";
  $("sets").textContent = "";
  addSetRow();
  fillExerciseList();
}

// Reads the set boxes. Returns null if anything is missing or wrong.
function readSets() {
  const sets = [];
  for (const row of $("sets").children) {
    const repsText = row.querySelector(".reps").value;
    const weightText = row.querySelector(".weight").value;
    const reps = Number(repsText);
    const weight = Number(weightText);
    if (repsText === "" || weightText === "" || !Number.isInteger(reps) || reps < 1 || !(weight >= 0)) return null;
    sets.push({ reps, weight });
  }
  return sets;
}

function saveWorkout(event) {
  event.preventDefault();
  const date = $("date").value;
  const exercise = $("exercise").value;
  const sets = readSets();

  if (!date) return showMessage("Please choose a date.", true);
  if (!exercise) return showMessage("Please choose an exercise.", true);
  if (!sets) return showMessage("Fill in reps (1 or more) and weight (0 or more) for every set.", true);

  const old = data.entries.find((e) => e.id === editingId);
  const entry = {
    id: old ? old.id : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: old ? old.createdAt : Date.now(),
    date, exercise, sets,
    notes: $("notes").value.trim()
  };
  const entries = old ? data.entries.map((e) => (e.id === old.id ? entry : e)) : [...data.entries, entry];
  if (!saveData({ ...data, entries })) return;

  renderAll();
  resetForm();
  if (old) {
    showTab("history");
    showMessage("Workout updated.");
  } else {
    $("date").value = date; // keep the date so you can log the next exercise
    showMessage(`Saved ${exercise}.`);
  }
}

function editEntry(id) {
  const entry = data.entries.find((e) => e.id === id);
  if (!entry) return;
  resetForm();
  editingId = id;
  $("form-title").textContent = "Edit workout";
  $("save").textContent = "Update Workout";
  $("cancel-edit").hidden = false;
  $("date").value = entry.date;
  fillExerciseList(entry.exercise);
  $("notes").value = entry.notes;
  $("sets").textContent = "";
  entry.sets.forEach((s) => addSetRow(s.reps, s.weight));
  showTab("log");
}

function deleteEntry(id) {
  const entry = data.entries.find((e) => e.id === id);
  if (!entry || !confirm(`Delete ${entry.exercise} on ${niceDate(entry.date)}?`)) return;
  if (!saveData({ ...data, entries: data.entries.filter((e) => e.id !== id) })) return;
  if (editingId === id) resetForm();
  renderAll();
  showMessage("Deleted.");
}

/* ---------- History ---------- */

function renderHistory() {
  const box = $("history");
  box.textContent = "";
  if (!data.entries.length) {
    box.append(make("p", "card empty", "No workouts yet. Log your first one on the Log tab."));
    return;
  }

  // Newest date first; within a date, in the order you logged them
  const sorted = [...data.entries].sort((a, b) => b.date.localeCompare(a.date) || a.createdAt - b.createdAt);
  let currentDate = "";

  for (const entry of sorted) {
    if (entry.date !== currentDate) {
      currentDate = entry.date;
      box.append(make("h2", "date-heading", niceDate(currentDate)));
    }
    const card = make("article", "card entry");
    card.append(make("h3", "", entry.exercise));

    const list = make("ul");
    entry.sets.forEach((s, i) => list.append(make("li", "", `Set ${i + 1}: ${s.reps} reps × ${weightLabel(s.weight)}`)));
    card.append(list);
    if (entry.notes) card.append(make("p", "notes", entry.notes));

    const buttons = make("div", "button-row");
    const edit = make("button", "secondary", "Edit");
    const remove = make("button", "danger", "Delete");
    edit.type = remove.type = "button";
    edit.addEventListener("click", () => editEntry(entry.id));
    remove.addEventListener("click", () => deleteEntry(entry.id));
    buttons.append(edit, remove);
    card.append(buttons);
    box.append(card);
  }
}

/* ---------- Personal bests ---------- */

// Heaviest set for each exercise. On a tie, more reps wins, then the earlier date.
function findBests(entries) {
  const bests = new Map();
  const oldestFirst = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const entry of oldestFirst) {
    for (const set of entry.sets) {
      const best = bests.get(entry.exercise);
      if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
        bests.set(entry.exercise, { weight: set.weight, reps: set.reps, date: entry.date });
      }
    }
  }
  return [...bests].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderBests() {
  const box = $("bests");
  box.textContent = "";
  const bests = findBests(data.entries);
  if (!bests.length) {
    box.append(make("p", "card empty", "Your personal bests will appear here after you log a workout."));
    return;
  }
  for (const [name, best] of bests) {
    const card = make("article", "card best");
    const left = make("div");
    left.append(make("h3", "", name), make("p", "best-detail", `${best.reps} reps on ${niceDate(best.date)}`));
    card.append(left, make("span", "best-weight", weightLabel(best.weight)));
    box.append(card);
  }
}

function renderAll() {
  renderHistory();
  renderBests();
}

/* ---------- Backup ---------- */

async function exportData() {
  if (storageProblem) return showMessage("Your saved data could not be read, so it cannot be exported.", true);

  const fileName = `workout-backup-${today()}.json`;
  const file = new File([JSON.stringify(data, null, 2)], fileName, { type: "application/json" });

  // On iPhone, the Share sheet ("Save to Files") is the most reliable way
  const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIPhone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error.name === "AbortError") return; // you closed the Share sheet
    }
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showMessage(`Backup file created: ${fileName}`);
}

async function importData(event) {
  const file = event.target.files[0];
  event.target.value = ""; // lets you pick the same file again
  if (!file) return;

  let incoming;
  try {
    incoming = cleanData(JSON.parse(await file.text()));
  } catch (error) {
    return showMessage("That file is not a valid workout backup. Nothing was changed.", true);
  }

  const question = `Replace the ${data.entries.length} entries on this device with the ${incoming.entries.length} entries in this file?`;
  if (!confirm(question)) return;

  const hadProblem = storageProblem;
  storageProblem = false;
  if (!saveData(incoming)) {
    storageProblem = hadProblem;
    return;
  }
  resetForm();
  renderAll();
  showMessage("Backup imported.");
}

/* ---------- Start the app ---------- */

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
$("workout-form").addEventListener("submit", saveWorkout);
$("add-exercise").addEventListener("click", addExercise);
$("new-exercise").addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); addExercise(); }
});
$("add-set").addEventListener("click", () => {
  const last = $("sets").lastElementChild;
  addSetRow(last.querySelector(".reps").value, last.querySelector(".weight").value);
});
$("cancel-edit").addEventListener("click", () => { resetForm(); showTab("history"); });
$("export").addEventListener("click", exportData);
$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", importData);

// If the app is open in two browser tabs, keep them in step
window.addEventListener("storage", () => {
  storageProblem = false;
  data = loadData();
  fillExerciseList($("exercise").value);
  renderAll();
});

// Offline support. Only works from a web address, not from a double-clicked file.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

resetForm();
renderAll();
if (storageProblem) showMessage("Your saved data could not be read. It has not been changed. Import a backup to fix this.", true);
