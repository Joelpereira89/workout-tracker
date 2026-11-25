// Simple line icons, drawn inside the app with SVG. Nothing is downloaded.
const ICON_PATHS = {
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
  today: "M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12",
  schedule: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  log: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8",
  history: "M3.5 12a8.5 8.5 0 1 0 2.7-6.2M4 3v4h4M12 8v4l3 2",
  bests: "M8 4h8v6a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 14v4M8 20h8",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19",
  moon: "M20 14.5A8.5 8.5 0 0 1 9.500 4a8.500 8.500 0 1 0 10.500 10.500z",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  day: "M4 6h16v14H4zM4 10h16M10 14h4v3h-4z",
  week: "M4 6h16v14H4zM4 10h16M7 15h10",
  month: "M4 6h16v14H4zM4 10h16M8 14h1M12 14h1M16 14h1M8 17h1M12 17h1M16 17h1",
  year: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  export: "M12 15V4M8 8l4-4 4 4M5 14v6h14v-6",
  import: "M12 4v11M8 11l4 4 4-4M5 14v6h14v-6",
  body: "M12 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM5 12l4-1h6l4 1M9 11v10M15 11v10M9 15h6",
  settings: "M4 7h10M18 7h2M4 17h2M10 17h10M16 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  play:"M7 4l13 8-13 8z",
  pause: "M8 5v14M16 5v14",
  check: "M4 12.500l5 5L20 6.500",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  clock:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  flame: "M12 3c1 4 6 5.500 6 11a6 6 0 0 1-12 0c0-2.500 1.500-4 2.500-5 0 2 1 3 2 3 1.500-2 .500-6 1.500-9z"
};

function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "icon");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICON_PATHS[name]);
  svg.append(path);
  return svg;
}
