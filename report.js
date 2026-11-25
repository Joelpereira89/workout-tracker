// Printable one-page monthly summary. It only reads your data.

function monthName(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function reportCard(days) {
  const card = make("div", "card");
  const label = make("label", "", "Month");
  const select = make("select");
  const months = [...new Set([today(), ...days.keys()].map((d) => d.slice(0, 7)))].sort().reverse();
  months.forEach((key) => select.append(new Option(monthName(key), key)));
  label.append(select);

  const button = make("button", "accent full", "Monthly summary");
  button.type = "button";
  button.prepend(icon("month"));
  button.addEventListener("click", () => openReport(select.value));
  card.append(make("h3", "first", "Monthly report"), label, button);
  return card;
}

// All the numbers for one month ("YYYY-MM")
function monthSummary(key) {
  const [y, m] = key.split("-").map(Number);
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  const days = workoutDays();
  const current = totals(days, from, to);
  const previous = totals(days, new Date(y, m - 2, 1), new Date(y, m - 1, 0));
  const timed = [...days].filter(([date, minutes]) => date.startsWith(key) && minutes > 0);
  const inMonth = data.entries.filter((e) => e.date.startsWith(key) && e.date <= today());

  const exercises = new Map();
  for (const e of inMonth) {
    const item = exercises.get(e.exercise) || { dates: new Set(), sets: 0, best: 0 };
    item.dates.add(e.date);
    item.sets += e.sets.length;
    item.best = Math.max(item.best, ...countedSets(e).map((s) => s.weight));
    exercises.set(e.exercise, item);
  }
  const top = [...exercises].sort((a, b) => b[1].dates.size - a[1].dates.size || b[1].sets - a[1].sets).slice(0, 6);

  // A new best = heavier than anything lifted for that exercise before this month
  const newBests = [];
  for (const [name, item] of exercises) {
    const earlier = data.entries.filter((e) => e.exercise === name && e.date < `${key}-01`).flatMap((e) => countedSets(e).map((s) => s.weight));
    if (earlier.length && item.best > Math.max(...earlier)) newBests.push(`${name}: ${weightLabel(item.best)}`);
  }

  return {
    current,
    previous,
    average: timed.length ? Math.round(current.minutes / timed.length) : 0,
    longest: Math.max(0, ...timed.map(([, minutes]) => minutes)),
    types: [...minutesByType(from, to)].filter(([, minutes]) => minutes > 0),
    volume: volume(from, to),
    top,
    newBests
  };
}

function openReport(key) {
  closeReport();
  const s = monthSummary(key);
  const sheet = make("div");
  sheet.id = "report";

  const actions = make("div", "report-actions");
  const print = make("button", "accent", "Print");
  print.type = "button";
  print.prepend(icon("export"));
  print.addEventListener("click", () => window.print());
  const close = make("button", "", "Close");
  close.type = "button";
  close.prepend(icon("close"));
  close.addEventListener("click", closeReport);
  actions.append(print, close);

  const page = make("article", "page");
  page.append(make("h2", "", `Workout summary: ${monthName(key)}`));

  const table = (title, rows, empty) => {
    page.append(make("h3", "", title));
    if (!rows.length) {
      page.append(make("p", "", empty));
      return;
    }
    const element = make("table");
    for (const row of rows) {
      const line = make("tr");
      row.forEach((cell) => line.append(make("td", "", cell)));
      element.append(line);
    }
    page.append(element);
  };

  const change = s.current.minutes - s.previous.minutes;
  table("Overview", [
    ["Workouts", String(s.current.count)],
    ["Total time", durationText(s.current.minutes)],
    ["Compared with the month before", change === 0 ? "Same time" : `${change > 0 ? "+" : "−"}${durationText(Math.abs(change))}`],
    ["Average workout", s.average ? durationText(s.average) : "No times"],
    ["Longest workout", s.longest ? durationText(s.longest) : "No times"],
    ["Total weight lifted", pounds(s.volume)]
  ]);
  table("Time by type", s.types.map(([type, minutes]) => [type, durationText(minutes)]), "No recorded time.");
  table("Most-trained exercises", s.top.map(([name, item]) => [name, `${item.dates.size} day${item.dates.size === 1 ? "" : "s"}${item.sets ? `, ${item.sets} sets, heaviest ${weightLabel(item.best)}` : ""}`]), "No exercises logged.");
  table("New personal bests", s.newBests.map((text) => [text]), "None this month.");

  sheet.append(actions, page);
  document.body.append(sheet);
  document.body.classList.add("reporting");
  close.focus();
}

function closeReport() {
  const sheet = $("report");
  if (sheet) sheet.remove();
  document.body.classList.remove("reporting");
}
