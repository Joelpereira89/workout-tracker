// Small tools used all over the app.

const $ = (id) => document.getElementById(id);
let messageTimer = null;

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
  return dateText(new Date());
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

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// A date in your own time zone, as YYYY-MM-DD
function dateText(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ---------- Sets and cardio ---------- */

const SET_TYPES = [["", "Set type"], ["warmup", "Warm-up"], ["working", "Working"], ["drop", "Drop set"], ["failure", "Failure"]];

// Warm-up sets never count towards personal bests or weight lifted
const countedSets = (entry) => entry.sets.filter((s) => s.type !== "warmup");

// " · Warm-up · RPE 7", or nothing for a plain set
function setExtras(set) {
  const type = set.type && SET_TYPES.find(([value]) => value === set.type);
  return `${type ? ` · ${type[1]}` : ""}${set.rpe ? ` · RPE ${set.rpe}` : ""}`;
}

// Adds type and RPE only when chosen, so plain sets stay as they always were
function makeSet(reps, weight, type, rpe) {
  return { reps, weight, ...(type ? { type } : {}), ...(rpe ? { rpe: Number(rpe) } : {}) };
}

function fillSetType(select, value) {
  SET_TYPES.forEach(([v, label]) => select.append(new Option(label, v)));
  select.value = value || "";
}

function fillRpe(select, value) {
  select.append(new Option("RPE", ""));
  for (let i = 1; i <= 10; i++) select.append(new Option(`RPE ${i}`, String(i)));
  select.value = value ? String(value) : "";
}

function cardioText(cardio) {
  return [durationText(cardio.minutes), cardio.distance ? `${cardio.distance} ${cardio.unit || "km"}` : "", cardio.calories ? `${cardio.calories} cal` : ""]
    .filter(Boolean).join(" · ");
}

// Turns the cardio boxes into saved data, or null if something is wrong
function readCardio(minutesText, distanceText, unit, caloriesText) {
  const minutes = Number(minutesText);
  const distance = Number(distanceText || 0);
  const calories = Number(caloriesText || 0);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !(distance >= 0) || !(calories >= 0)) return null;
  return { minutes, ...(distance ? { distance, unit } : {}), ...(calories ? { calories: Math.round(calories) } : {}) };
}

// The distance unit you used last time
function lastUnit() {
  const found = [...data.entries].reverse().find((e) => e.cardio && e.cardio.unit);
  return found ? found.cardio.unit : "km";
}

function weightLabel(weight) {
  return weight === 0 ? "Bodyweight" : `${weight} lbs`;
}
