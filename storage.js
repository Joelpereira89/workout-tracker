// Saving and loading. All your data lives in this browser's local storage.
const STORAGE_KEY = "workoutTracker";

let storageProblem = false; // true if saved data cannot be read safely

/* ---------- Saving and loading ---------- */

function emptyData() {
  return { version: 1, customExercises: [], entries: [], schedule: null, sessions: [] };
}

// Recorded workout times. Data saved before this feature has none.
function cleanSessions(sessions) {
  if (sessions === undefined) return [];
  const isSession = (s) => s && typeof s.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
    typeof s.startTime === "string" && Number.isInteger(s.minutes) && s.minutes > 0;
  if (!Array.isArray(sessions) || !sessions.every(isSession)) throw new Error("Some of the data is damaged");
  return sessions;
}

// The weekly schedule: seven days, Monday first. Anything unexpected is ignored.
function cleanSchedule(schedule) {
  const isDay = (d) => d && typeof d.free === "boolean" && typeof d.time === "string" && MINUTE_CHOICES.includes(d.minutes);
  return Array.isArray(schedule) && schedule.length === 7 && schedule.every(isDay) ? schedule : null;
}

// The weekly goal: a number of minutes or of workouts. Anything unexpected is ignored.
function cleanGoal(goal) {
  const ok = goal && (goal.type === "minutes" || goal.type === "workouts") && Number.isInteger(goal.target) && goal.target > 0;
  return ok ? goal : null;
}

// Checks that data (from storage or from a backup file) has the right shape.
function cleanData(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.entries) || !Array.isArray(raw.customExercises)) {
    throw new Error("Not workout tracker data");
  }
  const isSet = (s) => s && Number.isInteger(s.reps) && s.reps > 0 && Number.isFinite(s.weight) && s.weight >= 0;
  const isEntry = (e) => e && typeof e.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.exercise === "string" && e.exercise && Array.isArray(e.sets) && e.sets.every(isSet) &&
    // cardio entries have minutes instead of sets
    (e.sets.length || (e.cardio && Number.isInteger(e.cardio.minutes) && e.cardio.minutes > 0));

  if (!raw.entries.every(isEntry) || !raw.customExercises.every((n) => typeof n === "string")) {
    throw new Error("Some of the data is damaged");
  }
  const goal = cleanGoal(raw.goal);
  return {
    ...(goal ? { goal } : {}), // only present once you have set one
    ...(Array.isArray(raw.body) ? { body: raw.body.filter((b) => b && typeof b.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) } : {}),
    ...(Array.isArray(raw.routines) ? { routines: raw.routines.filter((r) => r && typeof r.name === "string" && Array.isArray(r.exercises)) } : {}),
    ...(raw.exerciseInfo && typeof raw.exerciseInfo === "object" ? { exerciseInfo: raw.exerciseInfo } : {}),
    version: 1,
    customExercises: raw.customExercises,
    schedule: cleanSchedule(raw.schedule),
    sessions: cleanSessions(raw.sessions),
    entries: raw.entries.map((e) => ({ ...e, notes: typeof e.notes === "string" ? e.notes : "" }))
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? cleanData(JSON.parse(saved)) : emptyData();
  } catch (error) {
    storageProblem = true;
    return emptyData();
  }
}

// Returns true only if the data was really saved.
function saveData(newData) {
  if (storageProblem) {
    showMessage("Your saved data could not be read, so nothing was changed. Import a backup to fix this.", true);
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  } catch (error) {
    showMessage("Could not save. Your browser may be blocking storage or be full.", true);
    return false;
  }
  data = newData;
  return true;
}
