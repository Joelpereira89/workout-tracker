// "Muscles trained": a front and back body outline shaded by the number of sets.

const BODY_MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
const muscleView = { period: "week", back: 0 };

// Simple shapes: [muscle, x, y, width, height]. "" = outline only.
const FRONT = [["Shoulders", 18, 40, 20, 18], ["Shoulders", 72, 40, 20, 18], ["Chest", 39, 42, 32, 26], ["Core", 42, 70, 26, 40],
  ["Arms", 13, 60, 16, 60], ["Arms", 81, 60, 16, 60], ["Legs", 38, 114, 15, 92], ["Legs", 57, 114, 15, 92]];
const REAR = [["Shoulders", 18, 40, 20, 18], ["Shoulders", 72, 40, 20, 18], ["Back", 39, 42, 32, 66],
  ["Arms", 13, 60, 16, 60], ["Arms", 81, 60, 16, 60], ["Legs", 38, 110, 15, 96], ["Legs", 57, 110, 15, 96]];

// Counted (not warm-up) sets per muscle group between two dates
function setsPerMuscle(from, to) {
  const totals = Object.fromEntries(BODY_MUSCLES.map((m) => [m, 0]));
  for (const e of data.entries) {
    const muscle = exerciseInfo(e.exercise).muscle;
    if (muscle in totals && e.date >= from && e.date <= to && e.date <= today()) totals[muscle] += countedSets(e).length;
  }
  return totals;
}

// Days since each group was last trained, or null if never
function daysSinceMuscle(muscle) {
  const dates = data.entries.filter((e) => e.date <= today() && countedSets(e).length && exerciseInfo(e.exercise).muscle === muscle).map((e) => e.date).sort();
  return dates.length ? daysBetween(dates[dates.length - 1], today()) : null;
}

function daysBetween(from, to) {
  const utc = (d) => { const [y, m, day] = d.split("-").map(Number); return Date.UTC(y, m - 1, day); };
  return Math.round((utc(to) - utc(from)) / 86400000);
}

function bodyOutline(title, shapes, sets) {
  const most = Math.max(...Object.values(sets), 1);
  const svg = svgElement("svg", { viewBox: "0 0 110 215", class: "body-map", role: "img", "aria-label": `${title} of body, shaded by sets` });
  svg.append(svgElement("circle", { cx: 55, cy: 20, r: 14, class: "part" }));
  for (const [muscle, x, y, width, height] of shapes) {
    const shape = svgElement("rect", { x, y, width, height, rx: 7, class: "part" });
    if (sets[muscle]) shape.style.cssText = `fill: var(--accent); fill-opacity: ${0.25 + 0.75 * (sets[muscle] / most)}`;
    shape.append(svgElement("title", {}, `${muscle}: ${sets[muscle]} sets`));
    svg.append(shape);
  }
  const figure = make("figure");
  figure.append(svg, make("figcaption", "hint", title));
  return figure;
}

function renderMuscles() {
  const box = $("muscles");
  box.textContent = "";
  const now = new Date();
  const week = muscleView.period === "week";
  const from = week ? addDays(mondayOf(now), -7 * muscleView.back) : new Date(now.getFullYear(), now.getMonth() - muscleView.back, 1);
  const to = week ? addDays(from, 6) : new Date(from.getFullYear(), from.getMonth() + 1, 0);
  const sets = setsPerMuscle(dateText(from), dateText(to));

  const card = make("div", "card");
  const pick = chips(["Week", "Month"], week ? "Week" : "Month", (value) => {
    if (!value) return;
    muscleView.period = value.toLowerCase();
    muscleView.back = 0;
    renderMuscles();
  });
  const nav = make("div", "chart-nav");
  const arrow = (name, label, step, disabled) => {
    const button = smallButton("", name, () => { muscleView.back += step; renderMuscles(); });
    button.setAttribute("aria-label", label);
    button.disabled = disabled;
    return button;
  };
  const range = week ? `${shortDate(from)} – ${shortDate(to, true)}` : from.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  nav.append(arrow("left", "Earlier", 1, false), make("span", "", range), arrow("right", "Later", -1, muscleView.back === 0));

  const figures = make("div", "body-maps");
  figures.append(bodyOutline("Front", FRONT, sets), bodyOutline("Back", REAR, sets));
  card.append(make("h3", "first", "Muscles trained"), pick, nav, figures, make("p", "hint", "Stronger colour means more sets. Warm-ups are not counted."));

  const list = make("dl", "stats");
  const neglected = [];
  for (const muscle of BODY_MUSCLES) {
    const since = daysSinceMuscle(muscle);
    const flag = since === null || since > 10;
    if (flag) neglected.push(since === null ? `${muscle} (not logged yet)` : `${muscle} (${since} days)`);
    const answer = make("dd", flag ? "warn" : "");
    answer.append(make("span", "", `${sets[muscle]} sets`));
    if (flag) answer.append(make("small", "", "Neglected"));
    list.append(make("dt", "", muscle), answer);
  }
  card.append(list);
  if (neglected.length) card.append(make("p", "warning-line", `Not trained for over 10 days: ${neglected.join(", ")}.`));
  box.append(card);
}
