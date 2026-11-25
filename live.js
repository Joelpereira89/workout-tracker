// Live Workout: the exercises and sets of the workout that is running now,
// the rest timer, and the summary shown when you finish.
// Nothing goes into your history until you tap Finish Workout.

const LIVE_KEY = "workoutLive"; // kept apart from history, and survives closing the app

let live = readLive();
let restTick = null;
let audio = null;

function readLive() {
  try {
    const saved = JSON.parse(localStorage.getItem(LIVE_KEY));
    if (saved && Array.isArray(saved.items)) return saved;
  } catch (error) { /* start fresh */ }
  return { items: [], rest: null };
}

function saveLive() {
  try {
    localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  } catch (error) {
    showMessage("Could not save the running workout. Your browser may be blocking storage or be full.", true);
  }
}

function clearLive() {
  live = { items: [], rest: null };
  try { localStorage.removeItem(LIVE_KEY); } catch (error) { /* nothing to remove */ }
  renderLive();
  renderRest();
}

/* ---------- Adding exercises and sets ---------- */

// Your most recent saved entry for an exercise
function lastEntry(name) {
  return data.entries
    .filter((e) => e.exercise === name && (e.sets.length || e.cardio))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)[0];
}

// A new exercise starts with last time's weights and reps
function addLiveExercise(name, count, targetReps) {
  const item = { key: newId(), name, notes: "", superset: "", target: targetReps || "" };
  const last = lastEntry(name);
  if (isCardio(name)) {
    item.cardio = { minutes: "", distance: "", unit: lastUnit(), calories: "", done: false };
  } else {
    const previous = last ? last.sets : [];
    const total = count || previous.length || 3;
    item.sets = Array.from({ length: total }, (_, i) => {
      const from = previous[Math.min(i, previous.length - 1)];
      return {
        weight: from ? from.weight : exerciseInfo(name).equipment === "Bodyweight" ? 0 : "",
        reps: from ? from.reps : targetReps || "",
        type: "", rpe: "", done: false
      };
    });
  }
  live.items.push(item);
  saveLive();
  renderLive();
}

function lastText(name, index) {
  const last = lastEntry(name);
  if (!last) return "First time: no earlier numbers.";
  if (last.cardio) return `Last time: ${cardioText(last.cardio)}`;
  const set = last.sets[Math.min(index, last.sets.length - 1)];
  return `Last time: ${set.weight} lb × ${set.reps}`;
}

// A number box with big minus and plus buttons
function stepper(label, set, field, step, mode) {
  const row = make("div", "stepper");
  const input = make("input");
  Object.assign(input, { type: "number", inputMode: mode, min: "0", step: "any", value: set[field] });
  if (mode === "numeric") input.setAttribute("pattern", "[0-9]*");
  input.setAttribute("aria-label", label);
  input.className = `live-${field}`;
  input.addEventListener("input", () => { set[field] = input.value === "" ? "" : Number(input.value); saveLive(); });

  const change = (amount) => () => {
    set[field] = Math.max(0, (Number(set[field]) || 0) + amount);
    input.value = set[field];
    saveLive();
  };
  const minus = smallButton(`−${step}`, "", change(-step));
  const plus = smallButton(`+${step}`, "", change(step));
  minus.setAttribute("aria-label", `${label} minus ${step}`);
  plus.setAttribute("aria-label", `${label} plus ${step}`);
  row.append(make("span", "stepper-label", label), minus, input, plus);
  return row;
}

function tickBox(checked, label, change) {
  const wrap = make("label", "tick");
  const box = make("input");
  box.type = "checkbox";
  box.checked = checked;
  box.addEventListener("change", () => change(box));
  wrap.append(box, make("span", "", label));
  return wrap;
}

function liveSet(item, set, index) {
  const row = make("div", set.done ? "live-set done" : "live-set");

  const done = tickBox(set.done, `Set ${index + 1}`, (box) => {
    if (box.checked && !(Number.isInteger(set.reps) && set.reps >= 1 && set.weight !== "" && set.weight >= 0)) {
      box.checked = false;
      return showMessage("Enter the weight (0 or more) and reps (1 or more) first.", true);
    }
    set.done = box.checked;
    row.classList.toggle("done", set.done);
    saveLive();
    if (set.done) startRest(item);
  });

  const type = make("select");
  fillSetType(type, set.type);
  type.setAttribute("aria-label", "Set type");
  type.addEventListener("change", () => { set.type = type.value; saveLive(); });
  const rpe = make("select");
  fillRpe(rpe, set.rpe);
  rpe.setAttribute("aria-label", "How hard it felt, 1 to 10");
  rpe.addEventListener("change", () => { set.rpe = rpe.value; saveLive(); });

  const remove = smallButton("", "close", () => { item.sets.splice(index, 1); saveLive(); renderLive(); }, "danger");
  remove.setAttribute("aria-label", "Remove set");

  const head = make("div", "live-set-head");
  head.append(done, remove);
  const extras = make("div", "set-extras");
  extras.append(type, rpe);
  row.append(head, make("p", "last-time", lastText(item.name, index)), stepper("lb", set, "weight", 5, "decimal"), stepper("reps", set, "reps", 1, "numeric"), extras);
  return row;
}

function liveCardio(item) {
  const cardio = item.cardio;
  const box = make("div", cardio.done ? "live-set done" : "live-set");
  const field = (text, key) => {
    const label = make("label", "", text);
    const input = make("input", `live-${key}`);
    Object.assign(input, { type: "number", inputMode: key === "distance" ? "decimal" : "numeric", min: "0", step: "any", value: cardio[key] });
    input.addEventListener("input", () => { cardio[key] = input.value; saveLive(); });
    label.append(input);
    return label;
  };
  const unit = make("select");
  unit.append(new Option("km", "km"), new Option("miles", "mi"));
  unit.value = cardio.unit;
  unit.addEventListener("change", () => { cardio.unit = unit.value; saveLive(); });
  const unitLabel = make("label", "", "Unit");
  unitLabel.append(unit);

  const grid = make("div", "duration");
  grid.append(field("Minutes", "minutes"), field("Calories (optional)", "calories"), field("Distance (optional)", "distance"), unitLabel);

  const done = tickBox(cardio.done, "Done", (check) => {
    if (check.checked && !readCardio(cardio.minutes, cardio.distance, cardio.unit, cardio.calories)) {
      check.checked = false;
      return showMessage("Enter the minutes first.", true);
    }
    cardio.done = check.checked;
    box.classList.toggle("done", cardio.done);
    saveLive();
  });
  box.append(make("p", "last-time", lastText(item.name, 0)), grid, done);
  return box;
}

// Two neighbouring exercises with the same superset code are a pair
function toggleSuperset(index) {
  const a = live.items[index];
  const b = live.items[index + 1];
  if (a.superset && a.superset === b.superset) {
    a.superset = b.superset = "";
  } else {
    const code = newId();
    live.items.forEach((item) => { if (item.superset && (item.superset === a.superset || item.superset === b.superset)) item.superset = ""; });
    a.superset = b.superset = code;
  }
  saveLive();
  renderLive();
}

function liveCard(item, index) {
  const next = live.items[index + 1];
  const paired = item.superset && live.items.filter((i) => i.superset === item.superset).length === 2;
  const card = make("div", paired ? "card superset" : "card");
  if (paired) card.append(make("p", "habit-title", "Superset"));
  card.append(make("h2", "", item.name));
  const info = exerciseInfo(item.name);
  if (info.notes) card.append(make("p", "hint", info.notes));

  if (item.cardio) {
    card.append(liveCardio(item));
  } else {
    const restLabel = make("label", "", "Rest after each set");
    const rest = make("select");
    for (let s = 30; s <= 300; s += 15) rest.append(new Option(`${s} seconds`, s));
    rest.value = info.rest;
    rest.addEventListener("change", () => saveExerciseInfo(item.name, { rest: Number(rest.value) }));
    restLabel.append(rest);
    card.append(restLabel);
    const hint = overloadHint(item);
    if (hint) {
      const box = make("div", "overload");
      box.append(make("p", "", `Progressive overload: you hit all ${hint.target} reps last time. Try ${hint.weight} lb today (+5).`),
        smallButton(`Use ${hint.weight} lb`, "bests", () => {
          item.sets.forEach((s) => { if (!s.done && s.type !== "warmup") s.weight = hint.weight; });
          saveLive();
          renderLive();
        }, "accent full"));
      card.append(box);
    }
    item.sets.forEach((set, i) => card.append(liveSet(item, set, i)));
    card.append(smallButton("Add set", "plus", () => {
      const previous = item.sets[item.sets.length - 1];
      item.sets.push(previous ? { ...previous, done: false } : { weight: "", reps: "", type: "", rpe: "", done: false });
      saveLive();
      renderLive();
    }, "full"));
  }

  const buttons = make("div", "button-row");
  if (next) buttons.append(smallButton(item.superset && item.superset === next.superset ? "Unpair superset" : "Superset with next", "", () => toggleSuperset(index)));
  buttons.append(smallButton("Remove exercise", "trash", () => {
    if (!confirm(`Remove ${item.name} from this workout?`)) return;
    live.items.splice(index, 1);
    saveLive();
    renderLive();
  }, "danger"));
  card.append(buttons);
  return card;
}

// Draws the Log screen: the running workout, or your routines when nothing is running
function renderLive() {
  const running = Boolean(readTimer());
  $("live").hidden = !running;
  $("routines").hidden = running;
  $("past-area").hidden = running && !editingId;
  if (!running) return;

  const box = $("live-items");
  box.textContent = "";
  if (!live.items.length) {
    const card = make("div", "card");
    card.append(emptyState("dumbbell", "Your workout is running. Add your first exercise below.", "Choose exercise", () => $("live-exercise").focus()));
    box.append(card);
  }
  live.items.forEach((item, i) => box.append(liveCard(item, i)));
  fillExerciseList("", $("live-exercise"));
}

function addChosenExercise() {
  const name = $("live-exercise").value;
  if (!name) return showMessage("Choose an exercise first.", true);
  addLiveExercise(name);
}

function discardWorkout() {
  if (!confirm("Discard this workout? Nothing from it will be saved.")) return;
  clearLive();
  writeTimer(null);
  renderLive();
}

/* ---------- Rest timer ---------- */

function startRest(item) {
  // In a superset, rest only after the second exercise
  const index = live.items.indexOf(item);
  const next = live.items[index + 1];
  if (item.superset && next && next.superset === item.superset) return;

  // Sound has to be switched on by a tap, which ticking a set is
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audio = audio || new Audio();
    audio.resume();
  } catch (error) { audio = null; }

  live.rest = { endsAt: Date.now() + exerciseInfo(item.name).rest * 1000 };
  saveLive();
  renderRest();
}

function restAlert() {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]); // not supported on iPhone
  if (!audio) return;
  [0, 0.25, 0.5].forEach((delay) => {
    const tone = audio.createOscillator();
    const volume = audio.createGain();
    tone.frequency.value = 880;
    volume.gain.value = 0.3;
    tone.connect(volume).connect(audio.destination);
    tone.start(audio.currentTime + delay);
    tone.stop(audio.currentTime + delay + 0.15);
  });
}

function renderRest() {
  clearInterval(restTick);
  const bar = $("rest");
  bar.hidden = !live.rest;
  document.body.classList.toggle("resting", Boolean(live.rest));
  if (!live.rest) return;

  const update = () => {
    const left = Math.ceil((live.rest.endsAt - Date.now()) / 1000);
    if (left > 0) {
      $("rest-time").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      return;
    }
    stopRest();
    restAlert();
    showMessage("Rest over. Time for your next set!");
  };
  restTick = setInterval(update, 250);
  update();
}

function stopRest() {
  live.rest = null;
  saveLive();
  renderRest();
}

function changeRest(seconds) {
  if (!live.rest) return;
  live.rest.endsAt += seconds * 1000;
  saveLive();
  renderRest();
}

/* ---------- Finishing ---------- */

// Sets with numbers in them that have not been ticked
function untickedSets() {
  return live.items.reduce((sum, item) => sum + (item.sets || []).filter((s) => !s.done && s.reps !== "").length, 0);
}

// Turns the ticked sets into history entries
function liveEntries(date) {
  const now = Date.now();
  const entries = [];
  live.items.forEach((item, i) => {
    const entry = { id: newId(), createdAt: now + i, date, exercise: item.name, sets: [], notes: item.notes || "" };
    if (item.cardio) {
      const cardio = item.cardio.done && readCardio(item.cardio.minutes, item.cardio.distance, item.cardio.unit, item.cardio.calories);
      if (!cardio) return;
      Object.assign(entry, { cardio, timed: true }); // the workout timer already counts these minutes
    } else {
      entry.sets = item.sets.filter((s) => s.done && Number.isInteger(s.reps) && s.reps >= 1 && s.weight !== "")
        .map((s) => makeSet(s.reps, Number(s.weight), s.type, s.rpe));
      if (!entry.sets.length) return;
    }
    if (item.superset) entry.superset = item.superset;
    entries.push(entry);
  });
  return entries;
}

// Must be worked out before the entries are saved
function workoutSummary(session, entries) {
  const bests = [];
  for (const name of new Set(entries.map((e) => e.exercise))) {
    const sets = entries.filter((e) => e.exercise === name).flatMap((e) => e.sets);
    if (!beatsBest(name, sets)) continue;
    const top = findBests([{ exercise: name, date: session.date, sets }])[0][1];
    bests.push(`${name}: ${weightLabel(top.weight)} × ${top.reps}`);
  }
  return {
    minutes: session.minutes,
    sets: entries.reduce((sum, e) => sum + e.sets.length, 0),
    volume: Math.round(entries.reduce((sum, e) => sum + countedSets(e).reduce((t, s) => t + s.reps * s.weight, 0), 0)),
    cardio: entries.filter((e) => e.cardio).map((e) => `${e.exercise}: ${cardioText(e.cardio)}`),
    bests,
    entries
  };
}

function showSummary(summary) {
  const box = $("summary");
  box.textContent = "";
  const card = make("div", "card");
  card.append(make("h2", "", "Workout complete"));
  const list = make("dl", "stats");
  for (const [label, value] of [["Duration", durationText(summary.minutes)], ["Total sets", String(summary.sets)], ["Weight lifted", pounds(summary.volume)]]) {
    list.append(make("dt", "", label), make("dd", "", value));
  }
  card.append(list, make("h3", "", "New personal bests"));
  if (summary.bests.length) summary.bests.forEach((text) => card.append(make("p", "habit-answer", text)));
  else card.append(make("p", "hint", "None this time. Keep going!"));
  if (summary.cardio.length) {
    card.append(make("h3", "", "Cardio"));
    summary.cardio.forEach((text) => card.append(make("p", "", text)));
  }
  if (summary.entries.length) card.append(saveRoutineForm(summary.entries));
  card.append(smallButton("Done", "check", () => { box.textContent = ""; showTab("dashboard"); }, "accent full"));
  box.append(card);
  showTab("log");
  box.scrollIntoView({ block: "start" });
  if (summary.bests.length) confetti();
}
