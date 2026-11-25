// Weekly goals (workouts, hours, or both) and their progress rings on the Dashboard.

let editingGoal = false;

function goalAmount(type, value) {
  if (type === "minutes") return durationText(value);
  return `${value} workout${value === 1 ? "" : "s"}`;
}

function goalCard(days) {
  const card = make("div", "card goal");
  card.append(make("h3", "first", "Weekly goal"));
  if (!data.goal || editingGoal) {
    card.append(goalForm());
    return card;
  }

  const monday = mondayOf(new Date());
  const week = totals(days, monday, addDays(monday, 6));
  for (const goal of goalList()) {
    const done = goal.type === "minutes" ? week.minutes : week.count;
    const percent = Math.floor((done / goal.target) * 100);
    const size = 2 * Math.PI * 50; // the length of the ring
    const ring = svgElement("svg", { viewBox: "0 0 120 120", class: percent >= 100 ? "ring reached" : "ring", role: "img", "aria-label": `${percent}% of weekly goal` });
    ring.append(
      svgElement("circle", { cx: 60, cy: 60, r: 50, class: "track" }),
      svgElement("circle", { cx: 60, cy: 60, r: 50, class: "progress", transform: "rotate(-90 60 60)", "stroke-dasharray": `${(Math.min(percent, 100) / 100) * size} ${size}`, visibility: percent ? "visible" : "hidden" }),
      svgElement("text", { x: 60, y: 68, "text-anchor": "middle" }, `${percent}%`)
    );
    const text = make("div");
    const left = goal.target - done;
    text.append(
      make("p", "goal-done", goalAmount(goal.type, done)),
      make("p", "hint", `of ${goalAmount(goal.type, goal.target)} this week`),
      make("p", "hint", left > 0 ? `${goalAmount(goal.type, left)} to go` : "Goal reached!")
    );
    const row = make("div", "goal-row");
    row.append(ring, text);
    card.append(row);
  }

  const streak = weekStreaks(days);
  card.append(make("p", "habit-answer", `${streak.current}-week streak`), make("p", "hint", "Weeks in a row that reached your goal."),
    smallButton("Change goal", "edit", () => { editingGoal = true; renderDashboard(); }, "full"));
  return card;
}

// Fill in either box, or both
function goalForm() {
  const form = make("form");
  form.noValidate = true;
  const current = Object.fromEntries(goalList().map((g) => [g.type, g.target]));

  const field = (text, value, mode) => {
    const label = make("label", "", text);
    const input = Object.assign(make("input"), { type: "number", inputMode: mode, min: "0", step: "any", value });
    label.append(input);
    form.append(label);
    return input;
  };
  const workouts = field("Workouts per week", current.workouts || "", "numeric");
  workouts.className = "goal-workouts";
  const hours = field("Hours per week", current.minutes ? Math.round((current.minutes / 60) * 100) / 100 : "", "decimal");
  hours.className = "goal-hours";
  form.append(make("p", "hint", "Fill in one or both."));

  const buttons = make("div", "button-row");
  const save = make("button", "accent", "Save goal");
  save.type = "submit";
  save.prepend(icon("save"));
  buttons.append(save);

  if (data.goal) {
    buttons.append(
      smallButton("Cancel", "close", () => { editingGoal = false; renderDashboard(); }),
      smallButton("Remove goal", "trash", () => {
        if (!confirm("Remove your weekly goal? Your workouts stay.")) return;
        const { goal, ...rest } = data;
        if (!saveData(rest)) return;
        editingGoal = false;
        renderDashboard();
      }, "danger")
    );
  }
  form.append(buttons);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const goals = [];
    if (workouts.value !== "") {
      const n = Number(workouts.value);
      if (!Number.isInteger(n) || n < 1 || n > 7) return showMessage("Enter a whole number of workouts from 1 to 7.", true);
      goals.push({ type: "workouts", target: n });
    }
    if (hours.value !== "") {
      const h = Number(hours.value);
      if (!(h >= 0.25 && h <= 100)) return showMessage("Enter hours between 0.25 and 100.", true);
      goals.push({ type: "minutes", target: Math.round(h * 60) });
    }
    if (!goals.length) return showMessage("Enter workouts, hours, or both.", true);
    if (!saveData({ ...data, goal: goals[1] ? { ...goals[0], extra: goals[1] } : goals[0] })) return;
    editingGoal = false;
    renderDashboard();
    showMessage("Goal saved.");
  });
  return form;
}
