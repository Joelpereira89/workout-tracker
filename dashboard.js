// Dashboard: workout time and progress. It only reads your data and never changes it.
// The bar chart itself is drawn in charts.js. All dates use the local time zone of the device.
// A "workout" is a day with at least one logged exercise or recorded time.

let chartPeriod = "day"; // day, week, month or year
let chartPage = 0;       // 0 = newest; 1 = one step back, and so on

const PERIODS = { day: "Day", week: "Week", month: "Month", year: "Year" };

/* ---------- Dates ---------- */

function parseDate(text) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, count) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

function mondayOf(date) {
  return addDays(date, -((date.getDay() + 6) % 7));
}

function shortDate(date, withYear) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
}

/* ---------- Calculations ---------- */

// One item per workout day: date -> total recorded minutes (0 if no time was recorded)
function workoutDays() {
  const days = new Map();
  const now = today();
  // Cardio done outside a timed workout adds its own minutes (inside one, the timer already has them)
  for (const e of data.entries) if (e.date <= now) days.set(e.date, (days.get(e.date) || 0) + (e.cardio && !e.timed ? e.cardio.minutes : 0));
  for (const s of data.sessions) if (s.date <= now) days.set(s.date, (days.get(s.date) || 0) + s.minutes);
  return days;
}

// Total minutes and number of workouts between two dates (both included)
function totals(days, from, to) {
  const first = dateText(from);
  const last = dateText(to);
  let minutes = 0;
  let count = 0;
  for (const [date, m] of days) {
    if (date >= first && date <= last) {
      minutes += m;
      count += 1;
    }
  }
  return { minutes, count };
}

// The exercise done on the most days. A tie goes to the one with more sets.
function mostTrained() {
  const found = new Map();
  for (const e of data.entries) {
    if (e.date > today()) continue;
    const item = found.get(e.exercise) || { dates: new Set(), sets: 0 };
    item.dates.add(e.date);
    item.sets += e.sets.length;
    found.set(e.exercise, item);
  }
  const ranked = [...found].sort((a, b) => b[1].dates.size - a[1].dates.size || b[1].sets - a[1].sets || a[0].localeCompare(b[0]));
  return ranked.length ? { name: ranked[0][0], count: ranked[0][1].dates.size } : null;
}

// The bars to draw: { from, to, label (under the bar), name (when tapped) }
function chartBars(days) {
  const now = new Date();
  const y = now.getFullYear();

  if (chartPeriod === "day") {
    const end = addDays(now, -30 * chartPage);
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(end, i - 29);
      return { from: d, to: d, label: (29 - i) % 7 === 1 ? `${d.getMonth() + 1}/${d.getDate()}` : "", name: niceDate(dateText(d)) };
    });
  }
  if (chartPeriod === "week") {
    const end = addDays(mondayOf(now), -7 * 12 * chartPage);
    return Array.from({ length: 12 }, (_, i) => {
      const from = addDays(end, (i - 11) * 7);
      return { from, to: addDays(from, 6), label: i % 2 ? `${from.getMonth() + 1}/${from.getDate()}` : "", name: `Week of ${shortDate(from, true)}` };
    });
  }
  if (chartPeriod === "month") {
    return Array.from({ length: 12 }, (_, i) => {
      const from = new Date(y, now.getMonth() - 12 * chartPage + i - 11, 1);
      return {
        from,
        to: new Date(from.getFullYear(), from.getMonth() + 1, 0),
        label: from.toLocaleDateString(undefined, { month: "short" }),
        name: from.toLocaleDateString(undefined, { month: "long", year: "numeric" })
      };
    });
  }
  const first = Math.min(y, ...[...days.keys()].map((d) => Number(d.slice(0, 4))));
  return Array.from({ length: y - first + 1 }, (_, i) => ({
    from: new Date(first + i, 0, 1),
    to: new Date(first + i, 11, 31),
    label: String(first + i),
    name: String(first + i)
  }));
}

/* ---------- Drawing ---------- */

function renderDashboard() {
  const box = $("dashboard");
  box.textContent = "";
  const days = workoutDays();

  // With nothing recorded yet, show a friendly start screen instead of blank charts
  if (!days.size) {
    const card = make("div", "card");
    card.append(emptyState("dumbbell", "No workouts this week yet. Let's change that!", "Start Workout", startWorkout));
    box.append(card, goalCard(days));
    return;
  }

  const recap = recapCard(days);
  if (recap) box.append(recap);
  const nudge = nudgeCard(days);
  if (nudge) box.append(nudge);
  box.append(summaryCards(days));
  const monday = mondayOf(new Date());
  if (!nudge && !totals(days, monday, addDays(monday, 6)).count) {
    const card = make("div", "card");
    card.append(emptyState("dumbbell", "No workouts this week yet. Let's change that!", "Start Workout", startWorkout));
    box.append(card);
  }
  box.append(goalCard(days), chartCard(days), typeCard(days), weekCard(days),
    calendarCard(days), volumeCard(), habitsCard(days), statsCard(days), reportCard(days));

  const untimed = [...days.values()].filter((m) => m === 0).length;
  if (untimed) {
    box.append(make("p", "hint", `${untimed} workout${untimed === 1 ? " has" : "s have"} no recorded time. They count as workouts but add no time. You can add times in History.`));
  }
}

function summaryCards(days) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monday = mondayOf(now);
  const yesterday = addDays(now, -1);

  const cards = [
    { title: "Today", icon: "flame", from: now, to: now, prevFrom: yesterday, prevTo: yesterday, versus: "yesterday", noCount: true },
    { title: "This week", icon: "week", from: monday, to: addDays(monday, 6), prevFrom: addDays(monday, -7), prevTo: addDays(monday, -1), versus: "last week" },
    { title: "This month", icon: "month", from: new Date(y, m, 1), to: new Date(y, m + 1, 0), prevFrom: new Date(y, m - 1, 1), prevTo: new Date(y, m, 0), versus: "last month" },
    { title: "This year", icon: "year", from: new Date(y, 0, 1), to: new Date(y, 11, 31), prevFrom: new Date(y - 1, 0, 1), prevTo: new Date(y - 1, 11, 31), versus: "last year" }
  ];

  const grid = make("div", "summary");
  for (const c of cards) {
    const current = totals(days, c.from, c.to);
    const change = current.minutes - totals(days, c.prevFrom, c.prevTo).minutes;
    const card = make("div", "card stat");
    const title = make("p", "stat-title", c.title);
    title.prepend(icon(c.icon));
    const number = make("p", "stat-value", durationText(current.minutes));
    number.dataset.minutes = current.minutes; // used by the count-up animation
    card.append(title, number);
    if (!c.noCount) card.append(make("p", "stat-count", `${current.count} workout${current.count === 1 ? "" : "s"}`));

    const text = change === 0 ? `Same as ${c.versus}` : `${change > 0 ? "+" : "−"}${durationText(Math.abs(change))} vs ${c.versus}`;
    card.append(make("p", change > 0 ? "change up" : change < 0 ? "change down" : "change", text));
    grid.append(card);
  }
  return grid;
}

function chartCard(days) {
  const card = make("div", "card");

  const selector = make("div", "periods");
  for (const [key, label] of Object.entries(PERIODS)) {
    const button = make("button", key === chartPeriod ? "secondary selected" : "secondary", label);
    button.type = "button";
    button.setAttribute("aria-pressed", key === chartPeriod);
    button.prepend(icon(key));
    button.addEventListener("click", () => { chartPeriod = key; chartPage = 0; renderDashboard(); });
    selector.append(button);
  }

  const bars = chartBars(days).map((bar) => ({ ...bar, minutes: totals(days, bar.from, bar.to).minutes }));
  const first = bars[0].from;
  const last = bars[bars.length - 1].to;
  const range = {
    day: `${shortDate(first)} – ${shortDate(last, true)}`,
    week: `${shortDate(first, true)} – ${shortDate(last, true)}`,
    month: `${first.toLocaleDateString(undefined, { month: "short", year: "numeric" })} – ${last.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`,
    year: "All years"
  }[chartPeriod];

  // The Year view already shows everything, so its arrows are switched off
  const canGoBack = chartPeriod !== "year" && [...days.keys()].some((d) => d < dateText(first));
  const nav = make("div", "chart-nav");
  const arrow = (symbol, label, enabled, step) => {
    const button = make("button", "secondary");
    button.append(icon(symbol));
    button.type = "button";
    button.disabled = !enabled;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", () => { chartPage += step; renderDashboard(); });
    return button;
  };
  nav.append(arrow("left", "Earlier", canGoBack, 1), make("span", "", range), arrow("right", "Later", chartPage > 0, -1));

  const sum = bars.reduce((total, bar) => total + bar.minutes, 0);
  const readout = make("p", "readout", `Total shown: ${durationText(sum)}`);
  readout.setAttribute("aria-live", "polite");

  const title = { day: "Time per day", week: "Time per week", month: "Time per month", year: "Time per year" }[chartPeriod];
  card.append(selector, make("h3", "", title), nav);
  if (sum) card.append(readout, barChart(bars, readout), make("p", "hint", "Tap a bar to see its exact value."));
  else card.append(emptyState("chart", "No time recorded in this period. Time your next workout to fill this in.", "Start Workout", startWorkout));
  return card;
}

function weekCard(days) {
  const card = make("div", "card");
  card.append(make("h3", "first", "This week"));
  const row = make("div", "week-boxes");
  const monday = mondayOf(new Date());

  DAY_NAMES.forEach((name, i) => {
    const date = dateText(addDays(monday, i));
    const worked = days.has(date);
    const minutes = days.get(date) || 0;
    let value = "–";
    if (worked) value = minutes ? durationText(minutes) : "✓";
    else if (date < today()) value = "Rest";

    const box = make("div", `day-box${worked ? "" : " off"}${date === today() ? " now" : ""}`);
    box.append(make("span", "day-short", name.slice(0, 3)), make("span", "day-value", value));
    row.append(box);
  });

  card.append(row, make("p", "hint", "✓ = a workout with no recorded time."));
  return card;
}

function statsCard(days) {
  const timed = [...days].filter(([, m]) => m > 0);
  const total = timed.reduce((sum, [, m]) => sum + m, 0);
  const longest = timed.reduce((best, item) => (!best || item[1] > best[1] ? item : best), null);
  const streak = weekStreaks(days);
  const favourite = mostTrained();
  const weekCount = (n) => `${n} week${n === 1 ? "" : "s"}`;
  const dayCount = (n) => `${n} day${n === 1 ? "" : "s"}`;

  // Each row: icon, label, value, and an optional smaller line under the value
  const rows = [
    ["clock", "Average workout", timed.length ? durationText(Math.round(total / timed.length)) : "No times yet"],
    ["bests", "Longest workout", longest ? durationText(longest[1]) : "No times yet", longest ? shortDate(parseDate(longest[0]), true) : ""],
    ["today", "Total workouts ever", String(days.size)],
    ["history", "Total time ever", durationText(total)],
    ["flame", "Current streak", data.goal ? weekCount(streak.current) : "Set a goal"],
    ["flame", "Longest streak", data.goal ? weekCount(streak.longest) : "Set a goal"],
    ["today", "Most-trained exercise", favourite ? favourite.name : "None yet", favourite ? dayCount(favourite.count) : ""]
  ];

  const card = make("div", "card");
  card.append(make("h3", "first", "Key stats"));
  const list = make("dl", "stats");
  for (const [iconName, label, value, detail] of rows) {
    const term = make("dt", "", label);
    term.prepend(icon(iconName));
    const answer = make("dd");
    answer.append(make("span", "", value));
    if (detail) answer.append(make("small", "", detail));
    list.append(term, answer);
  }
  card.append(list);
  return card;
}
