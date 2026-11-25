// Yearly calendar: one square per day, stronger colour for longer workouts.

let calendarYear = new Date().getFullYear();

// 0 = no workout, "u" = workout with no time, 1 to 4 = longer and longer
function dayLevel(days, date) {
  if (!days.has(date)) return 0;
  const minutes = days.get(date);
  if (!minutes) return "u";
  return minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 90 ? 3 : 4;
}

function calendarCard(days) {
  const card = make("div", "card");
  card.append(make("h3", "first", "Year calendar"));

  const thisYear = new Date().getFullYear();
  const firstYear = Math.min(thisYear, ...[...days.keys()].map((d) => Number(d.slice(0, 4))));
  const nav = make("div", "chart-nav");
  const arrow = (name, label, enabled, step) => {
    const button = make("button");
    button.type = "button";
    button.disabled = !enabled;
    button.setAttribute("aria-label", label);
    button.append(icon(name));
    button.addEventListener("click", () => { calendarYear += step; renderDashboard(); });
    return button;
  };
  nav.append(arrow("left", "Previous year", calendarYear > firstYear, -1), make("span", "", String(calendarYear)), arrow("right", "Next year", calendarYear < thisYear, 1));

  const readout = make("p", "hint", "Tap a day to see it.");
  readout.setAttribute("aria-live", "polite");

  // Columns are weeks (Monday at the top)
  const start = mondayOf(new Date(calendarYear, 0, 1));
  const step = 15;
  const left = 18;
  const top = 14;
  const cells = [];
  let column = 0;
  for (let i = 0, date = start; date.getFullYear() <= calendarYear; i++, date = addDays(start, i)) {
    if (date.getFullYear() < calendarYear) continue;
    column = Math.floor(i / 7);
    cells.push({ date, column, row: i % 7 });
  }

  const width = left + (column + 1) * step;
  const height = top + 7 * step;
  const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, width, height, class: "calendar", role: "img", "aria-label": `Workout calendar for ${calendarYear}` });
  [["Mon", 0], ["Wed", 2], ["Fri", 4]].forEach(([name, row]) => svg.append(svgElement("text", { x: 0, y: top + row * step + 9 }, name[0])));

  let nowColumn = 0;
  for (const cell of cells) {
    const key = dateText(cell.date);
    const x = left + cell.column * step;
    if (cell.date.getDate() === 1) svg.append(svgElement("text", { x, y: 9 }, cell.date.toLocaleDateString(undefined, { month: "short" })));
    if (key === today()) nowColumn = cell.column;
    const minutes = days.get(key);
    const square = svgElement("rect", { x, y: top + cell.row * step, width: 12, height: 12, rx: 3, class: `level-${dayLevel(days, key)}`, "data-date": key });
    square.addEventListener("click", () => {
      const what = !days.has(key) ? "no workout" : minutes ? durationText(minutes) : "workout, no time recorded";
      readout.textContent = `${niceDate(key)}: ${what}`;
    });
    svg.append(square);
  }

  const scroller = make("div", "calendar-scroll");
  scroller.append(svg);
  // Slide to the current week (or to December for past years)
  setTimeout(() => {
    scroller.scrollLeft = calendarYear === thisYear ? left + (nowColumn + 2) * step - scroller.clientWidth : width;
  }, 0);

  const legend = make("div", "legend");
  [["level-0", "None"], ["level-u", "No time"], ["level-1", "Under 30m"], ["level-2", "30–59m"], ["level-3", "1h–1h 29m"], ["level-4", "1h 30m+"]].forEach(([level, text]) => {
    const item = make("span");
    const swatch = svgElement("svg", { viewBox: "0 0 12 12", class: "swatch" });
    swatch.append(svgElement("rect", { x: 0.5, y: 0.5, width: 11, height: 11, rx: 3, class: level }));
    item.append(swatch, text);
    legend.append(item);
  });

  if ([...days.keys()].some((date) => date.startsWith(`${calendarYear}-`))) card.append(nav, scroller, readout, legend);
  else card.append(nav, emptyState("calendar", `No workouts in ${calendarYear} yet. Let's colour in the first day!`, "Start Workout", startWorkout));
  return card;
}
