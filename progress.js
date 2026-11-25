// Progress tab: charts for one exercise, your records, and the "add weight" hint.

let progressView = "charts"; // charts, records, muscles or badges
let progressExercise = "";

// Epley formula: weight x (1 + reps / 30). A single rep is simply the weight lifted.
const oneRepMax = (weight, reps) => (reps === 1 ? weight : Math.round(weight * (1 + reps / 30)));

// One item per date for an exercise, oldest first. Warm-up sets are left out.
function sessionsFor(name) {
  const days = new Map();
  for (const e of data.entries) {
    if (e.exercise !== name || e.date > today()) continue;
    for (const s of countedSets(e)) {
      const day = days.get(e.date) || { date: e.date, weight: 0, reps: 0, max: 0, volume: 0 };
      day.weight = Math.max(day.weight, s.weight);
      day.reps = Math.max(day.reps, s.reps);
      day.max = Math.max(day.max, oneRepMax(s.weight, s.reps));
      day.volume += s.weight * s.reps;
      days.set(e.date, day);
    }
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function renderProgress() {
  document.querySelectorAll("[data-progress]").forEach((b) => b.classList.toggle("selected", b.dataset.progress === progressView));
  $("progress-charts").hidden = progressView !== "charts";
  $("bests").hidden = progressView !== "records";
  $("muscles").hidden = progressView !== "muscles";
  $("badges").hidden = progressView !== "badges";
  renderExerciseCharts();
  renderBests();
  renderMuscles();
  renderBadges();
}

function renderExerciseCharts() {
  const box = $("progress-charts");
  box.textContent = "";
  const names = [...new Set(data.entries.filter((e) => countedSets(e).length).map((e) => e.exercise))].sort((a, b) => a.localeCompare(b));
  if (!names.length) {
    const card = make("div", "card");
    card.append(emptyState("chart", "No sets logged yet. Your progress charts will appear here.", "Start Workout", startWorkout));
    box.append(card);
    return;
  }
  if (!names.includes(progressExercise)) progressExercise = names[0];

  const label = make("label", "first", "Exercise");
  const select = make("select");
  names.forEach((n) => select.append(new Option(n, n)));
  select.value = progressExercise;
  select.addEventListener("change", () => { progressExercise = select.value; renderExerciseCharts(); });
  label.append(select);
  box.append(label);

  const history = sessionsFor(progressExercise);
  const pound = (v) => `${v.toLocaleString()} lbs`;
  for (const [title, key] of [["Heaviest weight", "weight"], ["Estimated one-rep max", "max"], ["Total volume per session", "volume"]]) {
    const card = make("div", "card");
    card.append(make("h3", "first", title), ...lineChart(history.map((d) => ({ date: d.date, value: Math.round(d[key]) })), { format: pound, label: title }));
    box.append(card);
  }
}

// For every exercise: heaviest weight, most reps, best estimated max, biggest session
function personalRecords() {
  const records = [];
  for (const name of [...new Set(data.entries.map((e) => e.exercise))].sort((a, b) => a.localeCompare(b))) {
    const history = sessionsFor(name);
    if (!history.length) continue;
    // the first date that reached the highest value
    const top = (key) => history.reduce((best, d) => (d[key] > best[key] ? d : best));
    records.push({ name, weight: top("weight"), reps: top("reps"), max: top("max"), volume: top("volume") });
  }
  return records;
}

/* ---------- Progressive overload ---------- */

// Target reps: from this workout's routine or plan, otherwise any routine, otherwise last time's first set
function overloadHint(item) {
  const last = lastEntry(item.name);
  const sets = last ? countedSets(last) : [];
  if (!sets.length) return null;
  const routine = routines().flatMap((r) => r.exercises).find((e) => e.name === item.name && e.reps);
  const target = item.target || (routine && routine.reps) || sets[0].reps;
  const weight = Math.max(...sets.map((s) => s.weight));
  if (!weight || !sets.every((s) => s.reps >= target)) return null;
  if (exerciseInfo(item.name).equipment === "Dumbbell" && weight >= 100) return null; // heaviest dumbbell
  return { target, weight: weight + 5 };
}
