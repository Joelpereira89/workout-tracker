// The Bests tab.

/* ---------- Personal bests ---------- */

// Heaviest set for each exercise. On a tie, more reps wins, then the earlier date.
function findBests(entries) {
  const bests = new Map();
  const oldestFirst = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  for (const entry of oldestFirst) {
    for (const set of countedSets(entry)) {
      const best = bests.get(entry.exercise);
      if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
        bests.set(entry.exercise, { weight: set.weight, reps: set.reps, date: entry.date });
      }
    }
  }
  return [...bests].sort((a, b) => a[0].localeCompare(b[0]));
}

function renderBests() {
  const box = $("bests");
  box.textContent = "";
  const records = personalRecords();
  if (!records.length) {
    const card = make("div", "card");
    card.append(emptyState("trophy", "No personal bests yet. Log a set and claim your first one!", "Log a set", () => showTab("log")));
    box.append(card);
    return;
  }
  for (const record of records) {
    const card = make("article", "card");
    card.append(make("h3", "first", record.name));
    const list = make("dl", "stats");
    for (const [label, value, date] of [
      ["Heaviest weight", weightLabel(record.weight.weight), record.weight.date],
      ["Most reps", String(record.reps.reps), record.reps.date],
      ["Best estimated 1RM", record.max.max ? `${record.max.max} lbs` : "–", record.max.date],
      ["Biggest session volume", record.volume.volume ? `${Math.round(record.volume.volume).toLocaleString()} lbs` : "–", record.volume.date]
    ]) {
      const answer = make("dd");
      answer.append(make("span", "", value), make("small", "", niceDate(date)));
      list.append(make("dt", "", label), answer);
    }
    card.append(list);
    box.append(card);
  }
}
