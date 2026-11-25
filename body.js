// Body tab: body weight and measurements, with trend charts.

// [saved name, label, unit]
const MEASURES = [["weight", "Body weight", "lbs"], ["waist", "Waist", "in"], ["chest", "Chest", "in"],
  ["arms", "Arms", "in"], ["thighs", "Thighs", "in"], ["fat", "Body fat", "%"]];

const bodyEntries = () => [...(data.body || [])].sort((a, b) => a.date.localeCompare(b.date));

// For each reading: the average of all readings in the 7 days ending on that date
function movingAverage(points) {
  return points.map((p) => {
    const week = points.filter((q) => { const d = daysBetween(q.date, p.date); return d >= 0 && d < 7; });
    return { date: p.date, value: Math.round((week.reduce((sum, q) => sum + q.value, 0) / week.length) * 10) / 10 };
  });
}

function renderBody() {
  const box = $("body-view");
  box.textContent = "";
  box.append(bodyForm());

  const entries = bodyEntries();
  if (!entries.length) {
    const card = make("div", "card");
    card.append(emptyState("chart", "No measurements yet. Log your weight to start the trend.", "Log my weight", () => $("body-weight").focus()));
    box.append(card);
    return;
  }

  for (const [key, label, unit] of MEASURES) {
    const points = entries.filter((e) => e[key]).map((e) => ({ date: e.date, value: e[key] }));
    if (!points.length) continue;
    const card = make("div", "card");
    const weight = key === "weight";
    card.append(make("h3", "first", label), ...lineChart(points, { format: (v) => `${v} ${unit}`, label: `${label} trend`, average: weight ? movingAverage(points) : null }));
    if (weight) card.append(make("p", "hint", "Faint line: each reading. Bold line: 7-day average."));
    box.append(card);
  }

  const list = make("div", "card");
  list.append(make("h3", "first", "Entries"));
  for (const e of [...entries].reverse()) {
    const text = MEASURES.filter(([key]) => e[key]).map(([key, label, unit]) => `${label} ${e[key]} ${unit}`).join(" · ");
    const remove = smallButton("Delete", "trash", () => {
      if (!confirm(`Delete the measurements for ${niceDate(e.date)}?`)) return;
      if (saveData({ ...data, body: data.body.filter((item) => item.id !== e.id) })) renderBody();
    }, "danger");
    const row = make("div", "time-row");
    const info = make("div");
    info.append(make("strong", "", niceDate(e.date)), make("p", "hint", text));
    row.append(info, remove);
    list.append(row);
  }
  box.append(list);
}

function bodyForm() {
  const form = make("form", "card");
  form.noValidate = true;
  form.append(make("h3", "first", "Log measurements"));
  const dateLabel = make("label", "", "Date");
  const date = Object.assign(make("input"), { type: "date", value: today() });
  dateLabel.append(date);
  form.append(dateLabel);

  const grid = make("div", "duration");
  const inputs = {};
  for (const [key, label, unit] of MEASURES) {
    const wrap = make("label", "", `${label} (${unit})`);
    inputs[key] = Object.assign(make("input"), { type: "number", inputMode: "decimal", min: "0", step: "any", id: `body-${key}` });
    wrap.append(inputs[key]);
    grid.append(wrap);
  }
  const save = make("button", "accent full", "Save measurements");
  save.type = "submit";
  save.prepend(icon("save"));
  form.append(grid, make("p", "hint", "Fill in only what you measured."), save);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = {};
    for (const [key] of MEASURES) {
      if (inputs[key].value === "") continue;
      const number = Number(inputs[key].value);
      if (!(number > 0) || number > (key === "fat" ? 75 : 1500)) return showMessage("Check the numbers: each must be more than 0 and realistic.", true);
      values[key] = number;
    }
    if (!date.value || !Object.keys(values).length) return showMessage("Choose a date and enter at least one measurement.", true);

    const old = (data.body || []).find((e) => e.date === date.value);
    if (old && Object.keys(values).some((k) => old[k]) && !confirm(`Replace the numbers already saved for ${niceDate(date.value)}?`)) return;
    const entry = { ...old, ...values, id: old ? old.id : newId(), date: date.value };
    if (!saveData({ ...data, body: [...(data.body || []).filter((e) => e !== old), entry] })) return;
    renderBody();
    showMessage("Measurements saved.");
  });
  return form;
}
