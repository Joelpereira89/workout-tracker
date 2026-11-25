// The "past workout" form: adding and editing one exercise at a time.

let editingId = null;       // set while you are editing an old entry

/* ---------- Log form ---------- */

// Fills a drop-down with exercises grouped by muscle. Hidden ones are left out.
function fillExerciseList(selected, list = $("exercise")) {
  list.textContent = "";
  list.append(new Option("Choose an exercise…", ""));

  const names = allExerciseNames().filter((n) => n === selected || !exerciseInfo(n).hidden);
  for (const muscle of [...MUSCLES, ""]) {
    const inGroup = names.filter((n) => (MUSCLES.includes(exerciseInfo(n).muscle) ? exerciseInfo(n).muscle : "") === muscle);
    if (!inGroup.length) continue;
    const group = document.createElement("optgroup");
    group.label = muscle || "My exercises";
    inGroup.forEach((name) => group.append(new Option(name, name)));
    list.append(group);
  }
  list.value = selected || "";
}

// Cardio exercises use minutes and distance instead of sets
function showFormFields() {
  const cardio = Boolean($("exercise").value) && isCardio($("exercise").value);
  $("strength-fields").hidden = cardio;
  $("cardio-fields").hidden = !cardio;
}

function addExercise() {
  const input = $("new-exercise");
  const name = input.value.trim();
  if (!name) return showMessage("Type the exercise name first.", true);

  const existing = allExerciseNames().find((n) => n.toLowerCase() === name.toLowerCase());
  if (!existing && !saveData({ ...data, customExercises: [...data.customExercises, name] })) return;

  fillExerciseList(existing || name);
  showFormFields();
  input.value = "";
  showMessage(existing ? "That exercise is already in the list, so I selected it." : `Added "${name}".`);
}

function addSetRow(reps = "", weight = "", type = "", rpe = "") {
  const row = make("div", "set-row");
  const number = make("span", "set-number");

  const repsInput = make("input", "reps");
  Object.assign(repsInput, { type: "number", inputMode: "numeric", min: "1", step: "1", value: reps });
  repsInput.setAttribute("pattern", "[0-9]*"); // number keypad on older iPhones too
  repsInput.setAttribute("aria-label", "Reps");

  const weightInput = make("input", "weight");
  Object.assign(weightInput, { type: "number", inputMode: "decimal", min: "0", step: "any", value: weight });
  weightInput.setAttribute("aria-label", "Weight in lbs");

  const remove = make("button", "danger");
  remove.append(icon("close"));
  remove.type = "button";
  remove.setAttribute("aria-label", "Remove set");
  remove.addEventListener("click", () => {
    row.remove();
    if (!$("sets").children.length) addSetRow();
    numberSets();
  });

  const typeSelect = make("select", "set-type");
  fillSetType(typeSelect, type);
  typeSelect.setAttribute("aria-label", "Set type");
  const rpeSelect = make("select", "set-rpe");
  fillRpe(rpeSelect, rpe);
  rpeSelect.setAttribute("aria-label", "How hard it felt");
  const extras = make("div", "set-extras");
  extras.append(typeSelect, rpeSelect);

  // A set is "completed" once you have typed both its reps and weight: show a tick
  const markDone = () => row.classList.toggle("done-set", Number(repsInput.value) >= 1 && weightInput.value !== "" && Number(weightInput.value) >= 0);
  repsInput.addEventListener("change", markDone);
  weightInput.addEventListener("change", markDone);

  row.append(number, repsInput, weightInput, remove, extras);
  $("sets").append(row);
  numberSets();
}

function numberSets() {
  [...$("sets").children].forEach((row, i) => { row.querySelector(".set-number").textContent = i + 1; });
}

function resetForm() {
  editingId = null;
  $("form-title").textContent = "Log a workout";
  $("save").textContent = "Save Workout";
  $("cancel-edit").hidden = true;
  $("date").value = today();
  $("notes").value = "";
  $("new-exercise").value = "";
  ["cardio-minutes", "cardio-distance", "cardio-calories"].forEach((id) => { $(id).value = ""; });
  $("cardio-unit").value = lastUnit();
  $("sets").textContent = "";
  addSetRow();
  fillExerciseList();
  showFormFields();
}

// Reads the set boxes. Returns null if anything is missing or wrong.
function readSets() {
  const sets = [];
  for (const row of $("sets").children) {
    const repsText = row.querySelector(".reps").value;
    const weightText = row.querySelector(".weight").value;
    const reps = Number(repsText);
    const weight = Number(weightText);
    if (repsText === "" || weightText === "" || !Number.isInteger(reps) || reps < 1 || !(weight >= 0)) return null;
    sets.push(makeSet(reps, weight, row.querySelector(".set-type").value, row.querySelector(".set-rpe").value));
  }
  return sets;
}

// The first set that beats your previous best (heavier, or more reps at the same weight)
function beatsBest(exercise, sets) {
  const previous = (findBests(data.entries).find(([name]) => name === exercise) || [])[1];
  return previous && sets.find((s) => s.type !== "warmup" && (s.weight > previous.weight || (s.weight === previous.weight && s.reps > previous.reps)));
}

function saveWorkout(event) {
  event.preventDefault();
  const date = $("date").value;
  const exercise = $("exercise").value;

  if (!date) return showMessage("Please choose a date.", true);
  if (!exercise) return showMessage("Please choose an exercise.", true);
  const cardioChosen = isCardio(exercise);
  const sets = cardioChosen ? [] : readSets();
  const cardio = cardioChosen ? readCardio($("cardio-minutes").value, $("cardio-distance").value, $("cardio-unit").value, $("cardio-calories").value) : null;
  if (!sets) return showMessage("Fill in reps (1 or more) and weight (0 or more) for every set.", true);
  if (cardioChosen && !cardio) return showMessage("Enter the minutes (1 or more). Distance and calories are optional.", true);

  const old = data.entries.find((e) => e.id === editingId);
  const entry = {
    ...old, // keeps details such as supersets
    id: old ? old.id : newId(),
    createdAt: old ? old.createdAt : Date.now(),
    date, exercise, sets,
    notes: $("notes").value.trim()
  };
  if (cardio) entry.cardio = cardio;
  else delete entry.cardio;

  const entries = old ? data.entries.map((e) => (e.id === old.id ? entry : e)) : [...data.entries, entry];
  const best = beatsBest(exercise, sets);
  if (!saveData({ ...data, entries })) return;

  renderAll();
  resetForm();
  if (old) {
    showTab("history");
    showMessage("Workout updated.");
  } else {
    $("date").value = date; // keep the date so you can log the next exercise
    showMessage(`Saved ${exercise}.`);
  }
  if (best) {
    const top = findBests([entry])[0][1];
    showMessage(`New personal best! ${exercise}: ${weightLabel(top.weight)} × ${top.reps}`);
    confetti();
  }
}

function editEntry(id) {
  const entry = data.entries.find((e) => e.id === id);
  if (!entry) return;
  resetForm();
  editingId = id;
  $("form-title").textContent = "Edit workout";
  $("save").textContent = "Update Workout";
  $("cancel-edit").hidden = false;
  $("date").value = entry.date;
  fillExerciseList(entry.exercise);
  $("notes").value = entry.notes;
  if (entry.cardio) {
    $("cardio-minutes").value = entry.cardio.minutes;
    $("cardio-distance").value = entry.cardio.distance || "";
    $("cardio-unit").value = entry.cardio.unit || lastUnit();
    $("cardio-calories").value = entry.cardio.calories || "";
  } else {
    $("sets").textContent = "";
    entry.sets.forEach((s) => addSetRow(s.reps, s.weight, s.type, s.rpe));
  }
  showFormFields();
  showTab("log");
  showPastForm();
}

// Opens the folded "past workout" form
function showPastForm() {
  $("past-area").hidden = false;
  $("past").open = true;
  $("past").scrollIntoView({ block: "start" });
}

function deleteEntry(id) {
  const entry = data.entries.find((e) => e.id === id);
  if (!entry || !confirm(`Delete ${entry.exercise} on ${niceDate(entry.date)}?`)) return;
  if (!saveData({ ...data, entries: data.entries.filter((e) => e.id !== id) })) return;
  if (editingId === id) resetForm();
  renderAll();
  showMessage("Deleted.");
}
