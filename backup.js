// Export and Import of your data.

/* ---------- Backup ---------- */

async function exportData() {
  if (storageProblem) return showMessage("Your saved data could not be read, so it cannot be exported.", true);

  const fileName = `workout-backup-${today()}.json`;
  const file = new File([JSON.stringify(data, null, 2)], fileName, { type: "application/json" });

  // On iPhone, the Share sheet ("Save to Files") is the most reliable way
  const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIPhone && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if (error.name === "AbortError") return; // you closed the Share sheet
    }
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  showMessage(`Backup file created: ${fileName}`);
}

async function importData(event) {
  const file = event.target.files[0];
  event.target.value = ""; // lets you pick the same file again
  if (!file) return;

  let incoming;
  let hasTimes;
  try {
    const raw = JSON.parse(await file.text());
    incoming = cleanData(raw);
    hasTimes = raw.sessions !== undefined;
  } catch (error) {
    return showMessage("That file is not a valid workout backup. Nothing was changed.", true);
  }

  const question = `Replace the ${data.entries.length} entries on this device with the ${incoming.entries.length} entries in this file?`;
  if (!confirm(question)) return;

  const hadProblem = storageProblem;
  storageProblem = false;
  // Older backups have no schedule or workout times, so keep the ones on this device
  const merged = { ...incoming, schedule: incoming.schedule || data.schedule, sessions: hasTimes ? incoming.sessions : data.sessions };
  for (const key of ["goal", "routines", "exerciseInfo", "body"]) if (!merged[key] && data[key]) merged[key] = data[key];
  if (!saveData(merged)) {
    storageProblem = hadProblem;
    return;
  }
  resetForm();
  renderAll();
  showMessage("Backup imported.");
}
