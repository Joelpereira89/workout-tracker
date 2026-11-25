// Weekly streaks, achievement badges, the Monday recap and the gentle nudge.
// Everything here is worked out from your history; nothing extra is stored in your data.

const RECAP_KEY = "workoutRecapDismissed"; // remembers which week's recap you closed

/* ---------- Weekly goals and streaks ---------- */

// Your goal, as a list of one or two targets
const goalList = () => (data.goal ? [data.goal, ...(data.goal.extra ? [data.goal.extra] : [])] : []);

function weekMet(days, monday) {
  const week = totals(days, monday, addDays(monday, 6));
  return goalList().every((g) => (g.type === "minutes" ? week.minutes : week.count) >= g.target);
}

// Consecutive weeks in which every goal was reached. Rest days make no difference.
function weekStreaks(days) {
  if (!data.goal || !days.size) return { current: 0, longest: 0 };
  const thisWeek = mondayOf(new Date());
  let monday = mondayOf(parseDate([...days.keys()].sort()[0]));
  let run = 0;
  let longest = 0;
  while (monday <= thisWeek) {
    if (weekMet(days, monday)) run += 1;
    else if (monday < thisWeek) run = 0; // this week is not over yet, so it cannot break the streak
    longest = Math.max(longest, run);
    monday = addDays(monday, 7);
  }
  return { current: run, longest };
}

/* ---------- Badges ---------- */

// Entries that beat everything done before for that exercise, oldest first
function bestsHistory() {
  const found = [];
  const sorted = [...data.entries].filter((e) => e.date <= today()).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
  const so = new Map();
  for (const e of sorted) {
    if (!countedSets(e).length) continue;
    const previous = so.get(e.exercise);
    const [, top] = findBests([e])[0];
    if (!previous || top.weight > previous.weight || (top.weight === previous.weight && top.reps > previous.reps)) {
      if (previous) found.push({ date: e.date, exercise: e.exercise, ...top });
      so.set(e.exercise, top);
    }
  }
  return found;
}

function badgeList() {
  const days = workoutDays();
  const minutes = [...days.values()].reduce((sum, m) => sum + m, 0);
  const lifted = data.entries.filter((e) => e.date <= today()).flatMap(countedSets).reduce((sum, s) => sum + s.weight * s.reps, 0);
  return [
    ["First Workout", days.size, 1],
    ["10 Workouts", days.size, 10],
    ["50 Workouts", days.size, 50],
    ["100 Workouts", days.size, 100],
    ["7-Week Streak", weekStreaks(days).longest, 7, data.goal ? "" : "Set a weekly goal first"],
    ["1,000 lb Total Lifted", Math.round(lifted), 1000],
    ["100 Hours", Math.floor(minutes / 60), 100],
    ["New PR", bestsHistory().length, 1]
  ].map(([name, have, need, note]) => ({ name, have: Math.min(have, need), need, earned: have >= need, note }));
}

function renderBadges() {
  const box = $("badges");
  box.textContent = "";
  const grid = make("div", "badge-grid");
  for (const badge of badgeList()) {
    const card = make("div", badge.earned ? "card badge earned" : "card badge");
    const bar = make("span", "habit-bar");
    const fill = make("span");
    fill.style.width = `${(badge.have / badge.need) * 100}%`;
    bar.append(fill);
    card.append(icon("bests"), make("strong", "", badge.name),
      make("span", "hint", badge.earned ? "Earned" : badge.note || `${badge.have.toLocaleString()} of ${badge.need.toLocaleString()}`), bar);
    grid.append(card);
  }
  box.append(grid);
}

/* ---------- Dashboard cards ---------- */

// Appears after 4 or more days without a workout
function nudgeCard(days) {
  if (!days.size) return null;
  const since = daysBetween([...days.keys()].sort().pop(), today());
  if (since < 4) return null;
  const card = make("div", "card nudge");
  card.append(emptyState("dumbbell", `You haven't trained in ${since} days. Even a short session counts!`, "Start Workout", startWorkout));
  return card;
}

function dismissedRecap() {
  try { return localStorage.getItem(RECAP_KEY); } catch (error) { return null; }
}

// Shown from Monday until you dismiss it
function recapCard(days) {
  const monday = mondayOf(new Date());
  if (dismissedRecap() === dateText(monday)) return null;
  const start = addDays(monday, -7);
  const end = addDays(monday, -1);
  const last = totals(days, start, end);
  const before = totals(days, addDays(start, -7), addDays(start, -1));
  if (!last.count && !before.count) return null;

  const lifted = volume(start, end);
  const liftedBefore = volume(addDays(start, -7), addDays(start, -1));
  const bests = bestsHistory().filter((b) => b.date >= dateText(start) && b.date <= dateText(end));
  const change = (value, format) => (value === 0 ? "same" : `${value > 0 ? "+" : "−"}${format(Math.abs(value))}`);

  const card = make("div", "card recap");
  card.append(make("h3", "first", "Last week recap"), make("p", "hint", `${shortDate(start)} – ${shortDate(end, true)}, compared with the week before`));
  const list = make("dl", "stats");
  for (const [label, value, difference] of [
    ["Total time", durationText(last.minutes), change(last.minutes - before.minutes, durationText)],
    ["Workouts", String(last.count), change(last.count - before.count, String)],
    ["Weight lifted", pounds(lifted), change(lifted - liftedBefore, pounds)]
  ]) {
    const answer = make("dd");
    answer.append(make("span", "", value), make("small", "", difference));
    list.append(make("dt", "", label), answer);
  }
  card.append(list, make("p", "habit-title", "New personal bests"));
  card.append(make("p", "", bests.length ? bests.map((b) => `${b.exercise} ${weightLabel(b.weight)} × ${b.reps}`).join(", ") : "None this time."));

  let message = "A fresh week is a fresh start. One session gets you rolling.";
  if (last.count && (last.count > before.count || last.minutes > before.minutes)) message = "You stepped it up. Brilliant work, keep it going!";
  else if (bests.length) message = "New bests! Your hard work is showing.";
  else if (last.count) message = "You showed up, and that is what builds results. Go again this week!";
  card.append(make("p", "habit-answer", message), smallButton("Dismiss", "close", () => {
    try { localStorage.setItem(RECAP_KEY, dateText(monday)); } catch (error) { /* it will show again */ }
    card.remove();
  }, "full"));
  return card;
}
