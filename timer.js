// Workout time: the running timer, manual entry, and the times shown in History.
// Uses make() from helpers.js and saveData() from storage.js.
//
// A saved time looks like: { id, date, startTime, minutes }
// They are kept apart from your exercise entries, so those are never changed.

// The running timer is stored separately, so it survives closing the page.
const TIMER_KEY = "workoutTimer";

/* ---------- Workout types ---------- */

const WORKOUT_TYPES = ["Strength", "Cardio", "Mobility", "Sport"];

function fillTypeList(select, value) {
  select.textContent = "";
  select.append(new Option("Not tagged", ""));
  WORKOUT_TYPES.forEach((type) => select.append(new Option(type, type)));
  select.value = value || "";
}

// Returns a copy with the type set, or with no type at all if left blank
function withType(item, type) {
  const copy = { ...item };
  if (type) copy.type = type;
  else delete copy.type;
  return copy;
}

function changeTimerType() {
  const timer = readTimer();
  if (timer) writeTimer(withType(timer, $("timer-type").value));
}

/* ---------- The running timer ---------- */

// Returns { startedAt, banked, runningSince } or null if no workout is running.
// banked = time counted before the last pause. runningSince = null while paused.
function readTimer() {
  try {
    const t = JSON.parse(localStorage.getItem(TIMER_KEY));
    const ok = t && Number.isFinite(t.startedAt) && Number.isFinite(t.banked) &&
      (t.runningSince === null || Number.isFinite(t.runningSince));
    return ok ? t : null;
  } catch (error) {
    return null;
  }
}

function writeTimer(timer) {
  try {
    if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    else localStorage.removeItem(TIMER_KEY);
  } catch (error) {
    showMessage("Could not save the timer. Your browser may be blocking storage or be full.", true);
  }
  renderTimer();
}

// Works from clock times, so it stays correct even if the page was closed
function elapsedMs(timer) {
  return timer.banked + (timer.runningSince === null ? 0 : Math.max(0, Date.now() - timer.runningSince));
}

function clockText(ms) {
  const total = Math.floor(ms / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60]
    .map((n) => String(n).padStart(2, "0")).join(":");
}

function updateClock() {
  const timer = readTimer();
  $("clock").textContent = clockText(timer ? elapsedMs(timer) : 0);
  // The floating button shows the running time
  $("fab-text").textContent = !timer ? "Start Workout" : `${timer.runningSince === null ? "Paused " : ""}${clockText(elapsedMs(timer))}`;
  $("fab").setAttribute("aria-label", timer ? "Go to your running workout" : "Start Workout");
}

function renderTimer() {
  const timer = readTimer();
  const paused = Boolean(timer) && timer.runningSince === null;
  $("timer-start").hidden = Boolean(timer);
  $("timer-pause").hidden = !timer || paused;
  $("timer-resume").hidden = !paused;
  $("timer-finish").hidden = !timer;

  let status = "Not started";
  if (timer) {
    const started = new Date(timer.startedAt);
    status = `${paused ? "Paused" : "Running"} · started ${niceDate(dateText(started))}, ${niceTime(timeText(started))}`;
  }
  $("timer-status").textContent = status;
  $("timer-card").classList.toggle("running", Boolean(timer));
  document.body.classList.toggle("live-on", Boolean(timer));
  if (timer) $("timer-type").value = timer.type || "";
  updateClock();
}

function startTimer() {
  if (readTimer()) return renderTimer();
  const now = Date.now();
  writeTimer(withType({ startedAt: now, banked: 0, runningSince: now }, $("timer-type").value));
  $("past").open = false;
  renderLive();
}

function pauseTimer() {
  const timer = readTimer();
  if (!timer || timer.runningSince === null) return renderTimer();
  writeTimer({ ...timer, banked: elapsedMs(timer), runningSince: null });
}

function resumeTimer() {
  const timer = readTimer();
  if (!timer || timer.runningSince !== null) return renderTimer();
  writeTimer({ ...timer, runningSince: Date.now() });
}

function finishTimer() {
  const timer = readTimer();
  if (!timer) return renderTimer();
  const minutes = Math.max(1, Math.round(elapsedMs(timer) / 60000));
  const unticked = untickedSets();
  const warning = unticked ? ` ${unticked} set${unticked === 1 ? " is" : "s are"} not ticked and will not be saved.` : "";
  if (!confirm(`Finish this workout and save ${durationText(minutes)}?${warning}`)) return;

  const started = new Date(timer.startedAt);
  const session = withType({ id: newId(), date: dateText(started), startTime: timeText(started), minutes }, timer.type);
  const entries = liveEntries(session.date); // the exercises you ticked
  const summary = workoutSummary(session, entries); // worked out before saving, to spot new bests
  if (!saveData({ ...data, sessions: [...data.sessions, session], entries: [...data.entries, ...entries] })) return; // nothing is lost
  clearLive();
  writeTimer(null);
  $("timer-type").value = "";
  renderAll();
  showMessage(`Workout saved: ${durationText(minutes)}.`);
  showSummary(summary);
}

/* ---------- Helpers ---------- */

function timeText(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function durationText(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Turns the hours and minutes boxes into total minutes, or null if not valid
function totalMinutes(hoursText, minutesText) {
  const h = Number(hoursText || 0);
  const m = Number(minutesText || 0);
  const ok = Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59 && h * 60 + m > 0;
  return ok ? h * 60 + m : null;
}

const BAD_DURATION = "Enter hours (0–23) and minutes (0–59), adding up to at least 1 minute.";

/* ---------- Manual entry on the Log screen ---------- */

function saveManualTime(event) {
  event.preventDefault();
  const date = $("time-date").value;
  const minutes = totalMinutes($("time-hours").value, $("time-minutes").value);
  if (!date) return showMessage("Please choose a date.", true);
  if (minutes === null) return showMessage(BAD_DURATION, true);

  const same = data.sessions.filter((s) => s.date === date);
  if (same.length && !confirm(`${niceDate(date)} already has a time recorded. Add another one? (To change it instead, use History.)`)) return;

  const session = withType({ id: newId(), date, startTime: $("time-start").value, minutes }, $("time-type").value);
  if (!saveData({ ...data, sessions: [...data.sessions, session] })) return;
  $("time-form").reset();
  $("time-date").value = today();
  renderHistory();
  showMessage(`Saved ${durationText(minutes)} for ${niceDate(date)}.`);
}

/* ---------- Times in History ---------- */

// The time line(s) shown under each date in History
function timeBlock(date) {
  const box = make("div", "times");
  const sessions = data.sessions.filter((s) => s.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const addRow = (text, buttonText, session) => {
    const row = make("div", "time-row");
    const button = make("button", "secondary", buttonText);
    button.type = "button";
    button.prepend(icon(session ? "edit" : "plus"));
    button.addEventListener("click", () => row.replaceWith(timeEditor(date, session)));
    const label = make("span", "time-text", text);
    if (session) label.prepend(icon("clock"));
    row.append(label, button);
    box.append(row);
  };

  // Cardio logged on its own counts as time too
  const cardio = data.entries.filter((e) => e.date === date && e.cardio && !e.timed).reduce((sum, e) => sum + e.cardio.minutes, 0);
  if (!sessions.length) addRow(cardio ? `Cardio time: ${durationText(cardio)}` : "No time recorded", "Add time", null);
  for (const s of sessions) {
    const started = s.startTime ? ` · started ${niceTime(s.startTime)}` : "";
    const type = s.type ? ` · ${s.type}` : "";
    addRow(`${durationText(s.minutes)}${started}${type}`, "Edit time", s);
  }
  return box;
}

// Small form for adding or changing one time inside History
function timeEditor(date, session) {
  const form = make("form", "card");
  form.noValidate = true;

  const field = (labelText, type, value) => {
    const label = make("label", "", labelText);
    const input = make("input");
    input.type = type;
    if (type === "number") Object.assign(input, { inputMode: "numeric", min: "0", step: "1" });
    input.value = value;
    label.append(input);
    form.append(label);
    return input;
  };

  const start = field("Start time (optional)", "time", session ? session.startTime : "");
  const hours = field("Hours", "number", session ? Math.floor(session.minutes / 60) : "");
  const mins = field("Minutes", "number", session ? session.minutes % 60 : "");

  const typeLabel = make("label", "", "Workout type");
  const type = make("select");
  fillTypeList(type, session && session.type);
  typeLabel.append(type);
  form.append(typeLabel);

  const buttons = make("div", "button-row");
  const save = make("button", "accent", "Save time");
  save.type = "submit";
  save.prepend(icon("save"));
  const cancel = make("button", "secondary", "Cancel");
  cancel.type = "button";
  cancel.prepend(icon("close"));
  cancel.addEventListener("click", renderHistory);
  buttons.append(save, cancel);

  if (session) {
    const remove = make("button", "danger", "Delete time");
    remove.type = "button";
    remove.prepend(icon("trash"));
    remove.addEventListener("click", () => {
      if (!confirm(`Delete the recorded time for ${niceDate(date)}? Your exercises stay.`)) return;
      if (!saveData({ ...data, sessions: data.sessions.filter((s) => s.id !== session.id) })) return;
      renderHistory();
      showMessage("Time deleted.");
    });
    buttons.append(remove);
  }
  form.append(buttons);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const minutes = totalMinutes(hours.value, mins.value);
    if (minutes === null) return showMessage(BAD_DURATION, true);
    const updated = withType({ ...session, id: session ? session.id : newId(), date, startTime: start.value, minutes }, type.value);
    const sessions = session
      ? data.sessions.map((s) => (s.id === session.id ? updated : s))
      : [...data.sessions, updated];
    if (!saveData({ ...data, sessions })) return;
    renderHistory();
    showMessage("Time saved.");
  });
  return form;
}
