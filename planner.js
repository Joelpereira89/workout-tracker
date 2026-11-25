// Planner: builds your workouts from your weekly schedule and your gym's equipment.
// Loaded before app.js, which provides helpers such as make() and saveData().

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MINUTE_CHOICES = [20, 30, 45, 60, 75, 90];

// The first exercise in each list is the main heavy lift.
// The order matters: shorter sessions keep the top of the list.
const SESSIONS = {
  fullA: ["Full body A", "Squat", "Bench Press", "Seated Row", "Dumbbell Shoulder Press", "Romanian Deadlift", "Preacher Curl", "Triceps Pushdown", "Ab Crunch Machine"],
  fullB: ["Full body B", "Deadlift", "Incline Dumbbell Press", "Lat Pulldown", "Leg Press", "Cable Shoulder Press", "Dumbbell Bicep Curl", "Dumbbell Triceps Extension", "Ab Crunch Machine"],
  push: ["Push (chest, shoulders, triceps)", "Bench Press", "Dumbbell Shoulder Press", "Incline Dumbbell Press", "Cable Lateral Raise", "Triceps Pushdown", "Cable Chest Fly", "Dumbbell Triceps Extension", "Ab Crunch Machine"],
  pull: ["Pull (back, biceps)", "Deadlift", "Lat Pulldown", "Seated Row", "Preacher Curl", "Dumbbell Row", "Dumbbell Bicep Curl", "Back Extension", "Ab Crunch Machine"],
  legs: ["Legs", "Squat", "Romanian Deadlift", "Leg Press", "Dumbbell Lunges", "Inner Thigh Machine", "Outer Thigh Machine", "Ab Crunch Machine"],
  upperA: ["Upper body A", "Bench Press", "Lat Pulldown", "Dumbbell Shoulder Press", "Seated Row", "Preacher Curl", "Triceps Pushdown", "Cable Chest Fly", "Dumbbell Lateral Raise"],
  upperB: ["Upper body B", "Overhead Press", "Barbell Row", "Incline Dumbbell Press", "Lat Pulldown", "Dumbbell Bicep Curl", "Dumbbell Triceps Extension", "Cable Lateral Raise", "Machine Chest Press"],
  lowerA: ["Lower body A", "Squat", "Romanian Deadlift", "Leg Press", "Inner Thigh Machine", "Outer Thigh Machine", "Ab Crunch Machine"],
  lowerB: ["Lower body B", "Deadlift", "Leg Press", "Dumbbell Lunges", "Back Extension", "Inner Thigh Machine", "Outer Thigh Machine", "Ab Crunch Machine"]
};

// Bigger movements that use several muscles. Everything else is a smaller movement.
const BIG_MOVES = new Set(["Squat", "Bench Press", "Deadlift", "Overhead Press", "Barbell Row", "Seated Row", "Lat Pulldown", "Leg Press",
  "Romanian Deadlift", "Incline Dumbbell Press", "Dumbbell Shoulder Press", "Cable Shoulder Press", "Machine Chest Press", "Dumbbell Row", "Dumbbell Lunges"]);

/* ---------- Planning rules ---------- */

// Which kinds of session to rotate through, based on how many days you are free
function splitFor(dayCount) {
  if (dayCount <= 2) return ["fullA", "fullB"];
  if (dayCount === 4) return ["upperA", "lowerA", "upperB", "lowerB"];
  return ["push", "pull", "legs"];
}

// Counts weeks (Monday to Sunday), so that rotations carry on from week to week
function weekNumber(date) {
  const days = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
  return Math.floor((days + 3) / 7);
}

// Returns seven items, Monday to Sunday: a session name, or null for a rest day
function planWeek(schedule, date) {
  let trainingDays = schedule.map((day, i) => (day.free ? i : -1)).filter((i) => i >= 0);
  if (trainingDays.length === 7) trainingDays = trainingDays.slice(0, 6); // always one rest day

  const split = splitFor(trainingDays.length);
  const start = weekNumber(date) * trainingDays.length;
  const week = Array(7).fill(null);
  trainingDays.forEach((dayIndex, i) => { week[dayIndex] = split[(start + i) % split.length]; });
  return week;
}

// Picks as many exercises as fit in the time available
function buildSession(key, minutes) {
  const [title, ...names] = SESSIONS[key];
  const short = minutes <= 30;
  let total = 5; // warm-up
  const exercises = [];

  for (let i = 0; i < names.length; i++) {
    let item;
    if (i === 0) item = { sets: short ? 3 : 4, low: 5, high: 8, rest: "2–3 min", cost: short ? 9 : 12 };
    else if (BIG_MOVES.has(names[i])) item = { sets: short ? 2 : 3, low: 8, high: 12, rest: "90 sec", cost: short ? 5 : 7 };
    else item = { sets: short ? 2 : 3, low: 10, high: 15, rest: "45–60 sec", cost: short ? 4 : 5 };
    // Long sessions: one extra set on everything after the main lift
    if (i > 0 && minutes >= 75) { item.sets += 1; item.cost += 2; }

    if (i > 1 && total + item.cost > minutes) break;
    total += item.cost;
    exercises.push({ name: names[i], ...item });
  }
  return { title, exercises, estimate: total };
}

// Suggests a weight using the last time you did this exercise before today
function suggestion(item) {
  const earlier = data.entries
    .filter((e) => e.exercise === item.name && e.date < today())
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  if (!earlier.length) {
    return { weight: "", text: "First time: choose a weight you could lift for about 2 more reps than you do." };
  }

  const last = earlier[0];
  const top = Math.max(...last.sets.map((s) => s.weight));
  const reps = last.sets.filter((s) => s.weight === top).map((s) => s.reps);
  const history = `Last time: ${weightLabel(top)} × ${reps.join(", ")}.`;
  const ready = reps.length >= item.sets && reps.every((r) => r >= item.high);
  const maxedDumbbell = item.name.startsWith("Dumbbell") || item.name.startsWith("Incline Dumbbell");

  if (top === 0) return { weight: 0, text: `${history} Try to add a rep.` };
  if (ready && !(maxedDumbbell && top >= 100)) return { weight: top + 5, text: `${history} Try ${top + 5} lbs.` };
  return { weight: top, text: `${history} Stay at ${top} lbs and add reps.` };
}

/* ---------- Today screen ---------- */

function niceTime(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function sessionDetails(daySettings) {
  return [niceTime(daySettings.time), `${daySettings.minutes} minutes free`].filter(Boolean).join(" · ");
}

function renderToday() {
  const box = $("today");
  box.textContent = "";

  if (!data.schedule || !data.schedule.some((d) => d.free)) {
    const card = make("div", "card empty");
    card.append(make("p", "", "Tell the app when you are free, and it will plan your workouts."));
    const button = make("button", "primary", "Set my schedule");
    button.type = "button";
    button.addEventListener("click", () => showTab("schedule"));
    card.append(button);
    box.append(card);
    return;
  }

  const now = new Date();
  const dayIndex = (now.getDay() + 6) % 7; // Monday = 0
  const week = planWeek(data.schedule, now);
  box.append(make("h2", "date-heading", niceDate(today())));

  if (!week[dayIndex]) {
    const card = make("div", "card");
    card.append(make("h2", "", "Rest day"));
    for (let ahead = 1; ahead <= 7; ahead++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ahead);
      const index = (date.getDay() + 6) % 7;
      const key = planWeek(data.schedule, date)[index];
      if (key) {
        card.append(make("p", "", `Next workout: ${DAY_NAMES[index]}, ${SESSIONS[key][0]}.`));
        break;
      }
    }
    box.append(card);
    return;
  }

  const settings = data.schedule[dayIndex];
  const session = buildSession(week[dayIndex], settings.minutes);

  const intro = make("div", "card");
  intro.append(
    make("h2", "", session.title),
    make("p", "hint", `${sessionDetails(settings)} · about ${session.estimate} minutes of work`),
    make("p", "hint", "Warm up first: 5 minutes of easy movement and 1–2 light sets of the first exercise.")
  );
  box.append(intro);

  for (const item of session.exercises) {
    const done = data.entries.some((e) => e.date === today() && e.exercise === item.name);
    const advice = suggestion(item);
    const card = make("article", done ? "card entry done" : "card entry");
    card.append(
      make("h3", "", done ? `✓ ${item.name}` : item.name),
      make("p", "target", `${item.sets} sets × ${item.low}–${item.high} reps · rest ${item.rest}`),
      make("p", "hint", advice.text)
    );
    const button = make("button", "secondary full", done ? "Log again" : "Log this");
    button.type = "button";
    button.addEventListener("click", () => logPlanned(item, advice.weight));
    card.append(button);
    box.append(card);
  }
}

// Opens the Log tab with the exercise, set count and suggested weight filled in
function logPlanned(item, weight) {
  resetForm();
  fillExerciseList(item.name);
  $("sets").textContent = "";
  for (let i = 0; i < item.sets; i++) addSetRow("", weight);
  showTab("log");
}

/* ---------- Schedule screen ---------- */

function renderSchedule() {
  const box = $("schedule-days");
  box.textContent = "";

  DAY_NAMES.forEach((name, i) => {
    const day = data.schedule ? data.schedule[i] : { free: false, time: "18:00", minutes: 60 };
    const row = make("div", "day");

    const label = make("label", "day-name");
    const free = make("input", "free");
    free.type = "checkbox";
    free.checked = day.free;
    label.append(free, make("span", "", name));

    const fields = make("div", "day-fields");
    const time = make("input", "time");
    time.type = "time";
    time.value = day.time;
    time.setAttribute("aria-label", `${name} start time`);
    const minutes = make("select", "minutes");
    minutes.setAttribute("aria-label", `${name} time available`);
    MINUTE_CHOICES.forEach((m) => minutes.append(new Option(`${m} minutes`, m)));
    minutes.value = day.minutes;
    fields.append(time, minutes);
    fields.hidden = !day.free;
    free.addEventListener("change", () => { fields.hidden = !free.checked; });

    row.append(label, fields);
    box.append(row);
  });

  renderWeek();
}

function saveSchedule() {
  const schedule = [...$("schedule-days").children].map((row) => ({
    free: row.querySelector(".free").checked,
    time: row.querySelector(".time").value,
    minutes: Number(row.querySelector(".minutes").value)
  }));
  if (!saveData({ ...data, schedule })) return;
  renderSchedule();
  renderToday();
  showMessage("Schedule saved.");
}

// The overview of this week underneath the schedule
function renderWeek() {
  const box = $("week");
  box.textContent = "";
  if (!data.schedule || !data.schedule.some((d) => d.free)) return;

  box.append(make("h2", "date-heading", "This week's plan"));
  planWeek(data.schedule, new Date()).forEach((key, i) => {
    if (!key) {
      box.append(make("div", "card rest", `${DAY_NAMES[i]}: Rest`));
      return;
    }
    const session = buildSession(key, data.schedule[i].minutes);
    const card = make("details", "card");
    card.append(make("summary", "", `${DAY_NAMES[i]}: ${session.title}`), make("p", "hint", sessionDetails(data.schedule[i])));
    const list = make("ul");
    session.exercises.forEach((e) => list.append(make("li", "", `${e.name}: ${e.sets} × ${e.low}–${e.high}`)));
    card.append(list);
    box.append(card);
  });
}
