// The built-in exercise list, and what is known about each exercise.
// Your own additions and changes are saved separately, so history is never rewritten.

const MUSCLES = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio"];
const EQUIPMENT = ["Barbell", "Dumbbell", "Machine", "Bodyweight", "Cable"];

// muscle group -> [name, equipment]
const BUILT_IN = {
  Chest: [["Bench Press", "Barbell"], ["Incline Bench Press", "Barbell"], ["Machine Chest Press", "Machine"], ["Dumbbell Bench Press", "Dumbbell"],
    ["Incline Dumbbell Press", "Dumbbell"], ["Dumbbell Fly", "Dumbbell"], ["Cable Chest Fly", "Cable"], ["Push-up", "Bodyweight"]],
  Back: [["Lat Pulldown", "Machine"], ["Seated Row", "Machine"], ["Barbell Row", "Barbell"], ["Dumbbell Row", "Dumbbell"], ["Deadlift", "Barbell"],
    ["Back Extension", "Machine"], ["Pull-up", "Bodyweight"], ["Chin-up", "Bodyweight"], ["Face Pull", "Cable"]],
  Legs: [["Squat", "Barbell"], ["Front Squat", "Barbell"], ["Leg Press", "Machine"], ["Dumbbell Lunges", "Dumbbell"], ["Goblet Squat", "Dumbbell"],
    ["Romanian Deadlift", "Barbell"], ["Inner Thigh Machine", "Machine"], ["Outer Thigh Machine", "Machine"], ["Leg Extension", "Machine"],
    ["Leg Curl", "Machine"], ["Calf Raise", "Dumbbell"]],
  Shoulders: [["Overhead Press", "Barbell"], ["Dumbbell Shoulder Press", "Dumbbell"], ["Cable Shoulder Press", "Cable"],
    ["Dumbbell Lateral Raise", "Dumbbell"], ["Cable Lateral Raise", "Cable"], ["Rear Delt Fly", "Dumbbell"], ["Arnold Press", "Dumbbell"]],
  Arms: [["Preacher Curl", "Barbell"], ["Dumbbell Bicep Curl", "Dumbbell"], ["Hammer Curl", "Dumbbell"], ["Cable Bicep Curl", "Cable"],
    ["Triceps Pushdown", "Cable"], ["Dumbbell Triceps Extension", "Dumbbell"], ["Skull Crusher", "Barbell"], ["Dips", "Bodyweight"]],
  Core: [["Ab Crunch Machine", "Machine"], ["Cable Crunch", "Cable"], ["Sit-up", "Bodyweight"], ["Hanging Leg Raise", "Bodyweight"], ["Russian Twist", "Bodyweight"]],
  Cardio: [["Running", "Bodyweight"], ["Cycling", "Machine"], ["Rowing", "Machine"], ["Walking", "Bodyweight"], ["Elliptical", "Machine"]]
};

const DEFAULT_EXERCISES = Object.fromEntries(Object.entries(BUILT_IN).map(([muscle, list]) => [muscle, list.map(([name]) => name)]));

const DEFAULT_REST = 90; // seconds

// Everything known about one exercise: the built-in details plus your changes
function exerciseInfo(name) {
  let base = { muscle: "", equipment: "", notes: "", rest: DEFAULT_REST, hidden: false };
  for (const [muscle, list] of Object.entries(BUILT_IN)) {
    const found = list.find(([n]) => n === name);
    if (found) base = { ...base, muscle, equipment: found[1] };
  }
  return { ...base, ...((data.exerciseInfo || {})[name] || {}) };
}

const isCardio = (name) => exerciseInfo(name).muscle === "Cardio";

// Built-in names, names you added, and any name found in your history
function allExerciseNames() {
  return [...new Set(Object.values(DEFAULT_EXERCISES).flat().concat(data.customExercises, data.entries.map((e) => e.exercise)))];
}

// Saves changes to one exercise's details (muscle, equipment, notes, rest, hidden)
function saveExerciseInfo(name, changes) {
  const all = { ...(data.exerciseInfo || {}) };
  all[name] = { ...all[name], ...changes };
  return saveData({ ...data, exerciseInfo: all });
}
