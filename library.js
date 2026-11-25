// The exercise library: search, filters, details, and adding, editing or hiding.

const libraryView = { search: "", muscle: "", equipment: "", showHidden: false, open: null, editing: null };

function renderLibrary() {
  const box = $("library");
  box.textContent = "";
  if (libraryView.editing !== null) box.append(exerciseForm(libraryView.editing));
  else if (libraryView.open) box.append(...exerciseDetail(libraryView.open));
  else box.append(libraryList());
}

function smallButton(text, iconName, action, className = "") {
  const button = make("button", className, text);
  button.type = "button";
  if (iconName) button.prepend(icon(iconName));
  button.addEventListener("click", action);
  return button;
}

function chips(options, selected, choose) {
  const row = make("div", "chips");
  options.forEach((option) => {
    const chip = smallButton(option, "", () => choose(selected === option ? "" : option), selected === option ? "selected" : "");
    chip.setAttribute("aria-pressed", selected === option);
    row.append(chip);
  });
  return row;
}

function libraryList() {
  const wrap = make("div");
  const search = make("input");
  Object.assign(search, { type: "search", placeholder: "Search exercises", value: libraryView.search });
  search.setAttribute("aria-label", "Search exercises");
  const results = make("div");

  // Only the results are redrawn while you type, so the keyboard stays open
  const show = () => {
    results.textContent = "";
    const text = libraryView.search.trim().toLowerCase();
    const names = allExerciseNames().filter((name) => {
      const info = exerciseInfo(name);
      return (libraryView.showHidden || !info.hidden) && name.toLowerCase().includes(text) &&
        (!libraryView.muscle || info.muscle === libraryView.muscle) && (!libraryView.equipment || info.equipment === libraryView.equipment);
    }).sort((a, b) => a.localeCompare(b));

    results.append(make("p", "hint", `${names.length} exercise${names.length === 1 ? "" : "s"}`));
    for (const name of names) {
      const info = exerciseInfo(name);
      const row = smallButton("", "", () => { libraryView.open = name; renderLibrary(); window.scrollTo(0, 0); }, "library-row");
      row.append(make("strong", "", name), make("span", "", [info.muscle, info.equipment, info.hidden ? "Hidden" : ""].filter(Boolean).join(" · ") || "No details yet"));
      results.append(row);
    }
    if (!names.length) {
      results.append(emptyState("dumbbell", "No exercise matches. Add it to your library.", "Add exercise", () => { libraryView.editing = ""; renderLibrary(); }));
    }
  };
  search.addEventListener("input", () => { libraryView.search = search.value; show(); });

  wrap.append(
    smallButton("Add exercise", "plus", () => { libraryView.editing = ""; renderLibrary(); }, "accent full"),
    search,
    chips(MUSCLES, libraryView.muscle, (value) => { libraryView.muscle = value; renderLibrary(); }),
    chips(EQUIPMENT, libraryView.equipment, (value) => { libraryView.equipment = value; renderLibrary(); }),
    smallButton(libraryView.showHidden ? "Leave out hidden" : "Show hidden", "", () => { libraryView.showHidden = !libraryView.showHidden; renderLibrary(); }, "full"),
    results
  );
  show();
  return wrap;
}

function exerciseDetail(name) {
  const info = exerciseInfo(name);
  const history = data.entries.filter((e) => e.exercise === name).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);

  const top = make("div", "card");
  top.append(make("h2", "", name), make("p", "hint", [info.muscle, info.equipment].filter(Boolean).join(" · ") || "No muscle group or equipment set"));
  if (info.notes) top.append(make("p", "notes", info.notes));

  const best = findBests(history)[0];
  if (best) top.append(make("p", "habit-title", "Personal best"), make("p", "habit-answer", `${weightLabel(best[1].weight)} × ${best[1].reps} (${niceDate(best[1].date)})`));
  const longest = Math.max(0, ...history.filter((e) => e.cardio).map((e) => e.cardio.minutes));
  if (longest) top.append(make("p", "habit-title", "Longest"), make("p", "habit-answer", durationText(longest)));

  const buttons = make("div", "button-row");
  buttons.append(
    smallButton("Back", "left", () => { libraryView.open = null; renderLibrary(); }),
    smallButton("Edit", "edit", () => { libraryView.editing = name; renderLibrary(); }),
    smallButton(info.hidden ? "Unhide" : "Hide", "close", () => {
      if (!saveExerciseInfo(name, { hidden: !info.hidden })) return;
      renderAll();
      resetForm();
      showMessage(info.hidden ? "Exercise is back in your lists." : "Hidden. Your history is kept.");
    })
  );
  top.append(buttons);
  if (readTimer()) top.append(smallButton("Add to workout", "plus", () => { addLiveExercise(name); showTab("log"); }, "accent full"));

  // Progress chart: best of each date, last 12 dates
  const perDate = new Map();
  for (const e of [...history].reverse()) {
    const value = e.cardio ? e.cardio.minutes : Math.max(0, ...countedSets(e).map((s) => s.weight));
    if (value) perDate.set(e.date, e.cardio ? (perDate.get(e.date) || 0) + value : Math.max(perDate.get(e.date) || 0, value));
  }
  const bars = [...perDate].slice(-12).map(([date, value], i, list) => ({
    minutes: value, name: niceDate(date), label: (list.length - 1 - i) % 3 === 0 ? shortDate(parseDate(date)) : ""
  }));
  const chart = make("div", "card");
  const cardio = info.muscle === "Cardio";
  chart.append(make("h3", "first", cardio ? "Minutes per day" : "Heaviest weight per day"));
  if (bars.length) {
    const readout = make("p", "readout", "Tap a bar");
    const options = cardio ? {} : { format: (v) => `${v} lbs`, axis: (v) => String(v), label: "Progress chart" };
    chart.append(readout, barChart(bars, readout, options));
  } else {
    chart.append(emptyState("chart", "Nothing to chart yet. Log this exercise to see your progress.", "Start Workout", () => { startWorkout(); addLiveExercise(name); }));
  }

  const list = make("div", "card");
  list.append(make("h3", "first", "Full history"));
  if (!history.length) list.append(make("p", "hint", "Not logged yet."));
  for (const e of history) {
    const text = e.cardio ? cardioText(e.cardio) : e.sets.map((s) => `${s.reps} × ${weightLabel(s.weight)}${setExtras(s)}`).join("; ");
    list.append(make("p", "habit-title", niceDate(e.date)), make("p", "history-line", text));
  }
  return [top, chart, list];
}

// name = "" adds a new exercise; otherwise edits that one
function exerciseForm(name) {
  const info = name ? exerciseInfo(name) : { muscle: "Chest", equipment: "Barbell", notes: "", rest: DEFAULT_REST };
  const form = make("form", "card");
  form.noValidate = true;
  form.append(make("h2", "", name ? `Edit ${name}` : "New exercise"));

  const field = (text, control) => {
    const label = make("label", "", text);
    label.append(control);
    form.append(label);
    return control;
  };
  const pick = (options, value) => {
    const select = make("select");
    select.append(new Option("Not set", ""));
    options.forEach((o) => select.append(new Option(o, o)));
    select.value = value;
    return select;
  };

  // Names cannot be changed, because that would mean rewriting your history
  const nameBox = name ? null : field("Name", Object.assign(make("input"), { type: "text", maxLength: 60 }));
  const muscle = field("Primary muscle group", pick(MUSCLES, info.muscle));
  const equipment = field("Equipment", pick(EQUIPMENT, info.equipment));
  const notes = field("Notes on form (optional)", Object.assign(make("textarea"), { rows: 3, maxLength: 500, value: info.notes }));

  const buttons = make("div", "button-row");
  const save = make("button", "accent", "Save exercise");
  save.type = "submit";
  buttons.append(save, smallButton("Cancel", "close", () => { libraryView.editing = null; renderLibrary(); }));
  form.append(buttons);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    let finalName = name;
    if (!name) {
      finalName = nameBox.value.trim();
      if (!finalName) return showMessage("Type the exercise name.", true);
      if (allExerciseNames().some((n) => n.toLowerCase() === finalName.toLowerCase())) return showMessage("That exercise is already in the library.", true);
      if (!saveData({ ...data, customExercises: [...data.customExercises, finalName] })) return;
    }
    if (!saveExerciseInfo(finalName, { muscle: muscle.value, equipment: equipment.value, notes: notes.value.trim() })) return;
    libraryView.editing = null;
    libraryView.open = finalName;
    renderAll();
    resetForm();
    showMessage("Exercise saved.");
  });
  return form;
}
