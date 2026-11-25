// Dashboard extras: time by workout type, weight lifted per week, and usual day and time.

/* ---------- Time by type (donut chart) ---------- */

// Total minutes of each type between two dates
function minutesByType(from, to) {
  const first = dateText(from);
  const last = dateText(to);
  const result = new Map([...WORKOUT_TYPES, "Not tagged"].map((type) => [type, 0]));
  for (const s of data.sessions) {
    if (s.date < first || s.date > last || s.date > today()) continue;
    const type = WORKOUT_TYPES.includes(s.type) ? s.type : "Not tagged";
    result.set(type, result.get(type) + s.minutes);
  }
  // Cardio logged outside a timed workout
  for (const e of data.entries) {
    if (e.cardio && !e.timed && e.date >= first && e.date <= last && e.date <= today()) result.set("Cardio", result.get("Cardio") + e.cardio.minutes);
  }
  return result;
}

const typeClass = (type) => `type-${type.toLowerCase().replace(" ", "-")}`;

// Uses the same period as the time chart above it
function typeCard(days) {
  const bars = chartBars(days);
  const from = bars[0].from;
  const to = bars[bars.length - 1].to;
  const split = [...minutesByType(from, to)].filter(([, minutes]) => minutes > 0);
  const total = split.reduce((sum, [, minutes]) => sum + minutes, 0);

  const card = make("div", "card");
  const period = { day: "last 30 days shown", week: "12 weeks shown", month: "12 months shown", year: "all years" }[chartPeriod];
  card.append(make("h3", "first", "Time by type"), make("p", "hint", `Same period as the chart above: ${period}.`));
  if (!total) {
    card.append(emptyState("chart", "No recorded time to split by type yet.", "Start Workout", startWorkout));
    return card;
  }

  const size = 2 * Math.PI * 45;
  const donut = svgElement("svg", { viewBox: "0 0 120 120", class: "donut", role: "img", "aria-label": "Share of time by workout type" });
  let used = 0;
  const list = make("ul", "type-list");
  for (const [type, minutes] of split) {
    const length = (minutes / total) * size;
    donut.append(svgElement("circle", { cx: 60, cy: 60, r: 45, class: typeClass(type), transform: "rotate(-90 60 60)", "stroke-dasharray": `${length} ${size - length}`, "stroke-dashoffset": -used }));
    used += length;

    const item = make("li");
    item.append(make("span", `dot ${typeClass(type)}`), make("span", "", type), make("strong", "", durationText(minutes)), make("span", "share", `${Math.round((minutes / total) * 100)}%`));
    list.append(item);
  }
  donut.append(svgElement("text", { x: 60, y: 65, "text-anchor": "middle" }, durationText(total)));
  card.append(donut, list);
  return card;
}

/* ---------- Weight lifted per week ---------- */

// Reps x weight, added up over every set between two dates
function volume(from, to) {
  const first = dateText(from);
  const last = dateText(to);
  let total = 0;
  for (const e of data.entries) {
    if (e.date < first || e.date > last || e.date > today()) continue;
    for (const s of countedSets(e)) total += s.reps * s.weight;
  }
  return Math.round(total);
}

const pounds = (value) => `${value.toLocaleString()} lbs`;
const shortNumber = (value) => (value >= 1000 ? `${value / 1000}k` : String(value));

function volumeCard() {
  const monday = mondayOf(new Date());
  const bars = Array.from({ length: 12 }, (_, i) => {
    const from = addDays(monday, (i - 11) * 7);
    return { minutes: volume(from, addDays(from, 6)), label: i % 2 ? `${from.getMonth() + 1}/${from.getDate()}` : "", name: `Week of ${shortDate(from, true)}` };
  });

  const card = make("div", "card");
  if (!bars.some((bar) => bar.minutes)) {
    card.append(make("h3", "first", "Weight lifted per week"),
      emptyState("dumbbell", "No weights logged in the last 12 weeks. Add a set to start the chart.", "Log a set", () => showTab("log")));
    return card;
  }
  const readout = make("p", "readout", `This week: ${pounds(bars[11].minutes)}`);
  readout.setAttribute("aria-live", "polite");
  card.append(
    make("h3", "first", "Weight lifted per week"),
    readout,
    barChart(bars, readout, { format: pounds, axis: shortNumber, label: "Bar chart of weight lifted per week" }),
    make("p", "hint", "Reps × weight for every set. Dumbbells count as the weight of one; bodyweight sets add nothing.")
  );
  return card;
}

/* ---------- Usual day and time ---------- */

const TIMES_OF_DAY = [
  { name: "Morning (5am–12pm)", from: 5, to: 12 },
  { name: "Afternoon (12–5pm)", from: 12, to: 17 },
  { name: "Evening (5–9pm)", from: 17, to: 21 },
  { name: "Night (9pm–5am)", from: 21, to: 29 }
];

// Counts workout days per weekday (Monday first) and sessions per time of day
function habits(days) {
  const weekdays = Array(7).fill(0);
  for (const date of days.keys()) weekdays[(parseDate(date).getDay() + 6) % 7] += 1;

  const times = TIMES_OF_DAY.map(() => 0);
  for (const s of data.sessions) {
    if (!s.startTime || s.date > today()) continue;
    let hour = Number(s.startTime.split(":")[0]);
    if (hour < 5) hour += 24;
    times[TIMES_OF_DAY.findIndex((t) => hour >= t.from && hour < t.to)] += 1;
  }
  return { weekdays, times };
}

// The name(s) with the highest count; ties are all listed
function winners(names, counts) {
  const top = Math.max(...counts);
  return top ? names.filter((_, i) => counts[i] === top).join(", ") : "Not enough data";
}

function habitsCard(days) {
  const { weekdays, times } = habits(days);
  const card = make("div", "card");
  card.append(make("h3", "first", "When you train"));

  for (const [title, names, counts, note] of [
    ["Most common day", DAY_NAMES, weekdays, "Counts workout days."],
    ["Most common time", TIMES_OF_DAY.map((t) => t.name), times, "Counts workouts with a start time."]
  ]) {
    card.append(make("p", "habit-title", title), make("p", "habit-answer", winners(names, counts)));
    const list = make("div", "habit-bars");
    const top = Math.max(...counts, 1);
    names.forEach((name, i) => {
      const bar = make("span", "habit-bar");
      const fill = make("span");
      fill.style.width = `${(counts[i] / top) * 100}%`;
      bar.append(fill);
      list.append(make("span", "", name.split(" ")[0].slice(0, 9)), bar, make("strong", "", String(counts[i])));
    });
    card.append(list, make("p", "hint", note));
  }
  return card;
}
