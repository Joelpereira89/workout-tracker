// Routines: saved lists of exercises with target sets and reps.

let editingRoutine = null; // a copy of the routine being edited

const routines = () => data.routines || [];

function saveRoutines(list) {
  return saveData({ ...data, routines: list });
}

function startRoutine(routine) {
  if (readTimer() && !confirm("A workout is already running. Add this routine's exercises to it?")) return;
  startWorkout();
  const codes = new Map(); // fresh superset codes for this workout
  for (const exercise of routine.exercises) {
    addLiveExercise(exercise.name, exercise.sets, exercise.reps);
    if (!exercise.superset) continue;
    if (!codes.has(exercise.superset)) codes.set(exercise.superset, newId());
    live.items[live.items.length - 1].superset = codes.get(exercise.superset);
  }
  saveLive();
  renderLive();
}

function renderRoutines() {
  const box = $("routines");
  box.textContent = "";
  if (editingRoutine) {
    box.append(routineEditor());
    return;
  }

  box.append(make("h2", "date-heading", "My routines"));
  if (!routines().length) {
    const card = make("div", "card");
    card.append(emptyState("dumbbell", "No routines yet. Make one, such as Push Day, and start it with one tap.", "New routine", () => editRoutine()));
    box.append(card);
    return;
  }
  for (const routine of routines()) {
    const card = make("div", "card");
    card.append(make("h2", "", routine.name), make("p", "hint", routine.exercises.map((e) => (isCardio(e.name) ? e.name : `${e.name} ${e.sets}×${e.reps || "–"}`)).join(", ")));
    card.append(smallButton(`Start ${routine.name}`, "play", () => startRoutine(routine), "accent full"));
    const buttons = make("div", "button-row");
    buttons.append(
      smallButton("Edit", "edit", () => editRoutine(routine)),
      smallButton("Delete", "trash", () => {
        if (!confirm(`Delete the routine "${routine.name}"? Your history stays.`)) return;
        if (saveRoutines(routines().filter((r) => r.id !== routine.id))) renderRoutines();
      }, "danger")
    );
    card.append(buttons);
    box.append(card);
  }
  box.append(smallButton("New routine", "plus", () => editRoutine(), "full"));
}

function editRoutine(routine) {
  editingRoutine = routine ? JSON.parse(JSON.stringify(routine)) : { id: "", name: "", exercises: [] };
  renderRoutines();
}

function routineEditor() {
  const draft = editingRoutine;
  const card = make("div", "card");
  card.append(make("h2", "", draft.id ? "Edit routine" : "New routine"));
  const nameLabel = make("label", "", "Routine name");
  const name = Object.assign(make("input"), { type: "text", maxLength: 40, value: draft.name, placeholder: "Push Day" });
  name.addEventListener("input", () => { draft.name = name.value; });
  nameLabel.append(name);
  card.append(nameLabel);

  draft.exercises.forEach((exercise, i) => {
    const row = make("div", "routine-row");
    const number = (text, key) => {
      const label = make("label", "", text);
      const input = Object.assign(make("input"), { type: "number", inputMode: "numeric", min: "1", value: exercise[key] });
      input.addEventListener("input", () => { exercise[key] = Number(input.value) || ""; });
      label.append(input);
      return label;
    };
    const remove = smallButton("", "close", () => { draft.exercises.splice(i, 1); renderRoutines(); }, "danger");
    remove.setAttribute("aria-label", `Remove ${exercise.name}`);
    row.append(make("strong", "", exercise.name), number("Sets", "sets"), number("Reps", "reps"), remove);
    card.append(row);
  });

  const addLabel = make("label", "", "Add an exercise");
  const picker = make("select");
  fillExerciseList("", picker);
  picker.addEventListener("change", () => {
    if (!picker.value) return;
    draft.exercises.push({ name: picker.value, sets: 3, reps: 10 });
    renderRoutines();
  });
  addLabel.append(picker);

  const buttons = make("div", "button-row");
  buttons.append(
    smallButton("Save routine", "save", () => {
      if (!draft.name.trim()) return showMessage("Give the routine a name.", true);
      if (!draft.exercises.length) return showMessage("Add at least one exercise.", true);
      const saved = { ...draft, id: draft.id || newId(), name: draft.name.trim(), exercises: draft.exercises.map((e) => ({ ...e, sets: Math.min(20, Math.max(1, Math.round(e.sets) || 3)) })) };
      const list = draft.id ? routines().map((r) => (r.id === draft.id ? saved : r)) : [...routines(), saved];
      if (!saveRoutines(list)) return;
      editingRoutine = null;
      renderRoutines();
      showMessage("Routine saved.");
    }, "accent"),
    smallButton("Cancel", "close", () => { editingRoutine = null; renderRoutines(); })
  );
  card.append(addLabel, buttons);
  return card;
}

// On the workout summary screen
function saveRoutineForm(entries) {
  const wrap = make("div");
  const label = make("label", "", "Save as routine (name it)");
  const name = Object.assign(make("input"), { type: "text", maxLength: 40, placeholder: "Push Day" });
  label.append(name);
  const button = smallButton("Save as routine", "save", () => {
    if (!name.value.trim()) return showMessage("Give the routine a name.", true);
    const exercises = entries.map((e) => ({
      name: e.exercise,
      sets: countedSets(e).length || 1,
      reps: countedSets(e).length ? countedSets(e)[0].reps : "",
      ...(e.superset ? { superset: e.superset } : {})
    }));
    if (!saveRoutines([...routines(), { id: newId(), name: name.value.trim(), exercises }])) return;
    button.disabled = true;
    renderRoutines();
    showMessage("Routine saved.");
  }, "full");
  wrap.append(label, button);
  return wrap;
}
