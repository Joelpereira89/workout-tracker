// The History tab.

/* ---------- History ---------- */

function renderHistory() {
  const box = $("history");
  box.textContent = "";
  if (!data.entries.length && !data.sessions.length) {
    const card = make("div", "card");
    card.append(emptyState("dumbbell", "No workouts yet. Your first one will show up here.", "Start Workout", startWorkout));
    box.append(card);
    return;
  }

  // Newest date first; within a date, in the order you logged them
  const sorted = [...data.entries].sort((a, b) => b.date.localeCompare(a.date) || a.createdAt - b.createdAt);
  // Include days that have a recorded time but no exercises
  const dates = [...new Set(data.entries.concat(data.sessions).map((item) => item.date))].sort().reverse();

  for (const date of dates) {
    box.append(make("h2", "date-heading", niceDate(date)), timeBlock(date));
    for (const entry of sorted.filter((e) => e.date === date)) box.append(entryCard(entry));
  }
}

function entryCard(entry) {
  const card = make("article", "card entry");
  card.append(make("h3", "", entry.exercise));

  const list = make("ul");
  entry.sets.forEach((s, i) => {
    const item = make("li");
    item.append(`Set ${i + 1}: `, make("strong", "", s.reps), " reps × ", make("strong", "", weightLabel(s.weight)), setExtras(s));
    list.append(item);
  });
  if (entry.cardio) {
    const item = make("li");
    item.append(make("strong", "", cardioText(entry.cardio)));
    list.append(item);
  }
  if (entry.superset) card.append(make("p", "hint", "Part of a superset"));
  card.append(list);
  if (entry.notes) card.append(make("p", "notes", entry.notes));

  const buttons = make("div", "button-row");
  const edit = make("button", "secondary", "Edit");
  const remove = make("button", "danger", "Delete");
  edit.type = remove.type = "button";
  edit.prepend(icon("edit"));
  remove.prepend(icon("trash"));
  edit.addEventListener("click", () => editEntry(entry.id));
  remove.addEventListener("click", () => deleteEntry(entry.id));
  buttons.append(edit, remove);
  card.append(buttons);
  return card;
}
