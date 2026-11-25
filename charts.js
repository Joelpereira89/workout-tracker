// Draws charts. Used by the Dashboard.

const SVG_NS = "http://www.w3.org/2000/svg"; // a label the browser needs; nothing is loaded from it

// Creates one piece of an SVG drawing
function svgElement(tag, attributes, text) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  if (text !== undefined) element.textContent = text;
  return element;
}

// A round gridline step (1, 2 or 5 times a power of ten) giving at most four lines
function roundStep(biggest) {
  const rough = biggest / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((n) => n * power).find((s) => s >= rough);
}

// A line chart over time. points = [{ date, value }], oldest first.
// options: format (how to write a value), label, average (a second, smoothed series)
// Returns [readout line, drawing] to add to a card.
function lineChart(points, options) {
  const readout = make("p", "readout small");
  readout.setAttribute("aria-live", "polite");
  if (!points.length) return [make("p", "hint", "Nothing to chart yet.")];

  const width = 340, height = 180, left = 44, right = 8, top = 10, bottom = 22;
  const format = options.format;
  const all = points.map((p) => p.value).concat((options.average || []).map((p) => p.value));
  let low = Math.min(...all);
  let high = Math.max(...all);
  if (low === high) { low -= 1; high += 1; }
  const time = (date) => parseDate(date).getTime();
  const first = time(points[0].date);
  const span = time(points[points.length - 1].date) - first;
  const x = (p) => (span ? left + ((time(p.date) - first) / span) * (width - left - right) : (left + width - right) / 2);
  const y = (v) => top + (1 - (v - low) / (high - low)) * (height - top - bottom);

  const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, class: "chart line", role: "group", "aria-label": options.label });
  for (const value of [low, (low + high) / 2, high]) {
    const shown = Math.round(value * 10) / 10;
    svg.append(svgElement("line", { x1: left, x2: width - right, y1: y(value), y2: y(value), class: "grid" }),
      svgElement("text", { x: left - 5, y: y(value) + 3, "text-anchor": "end" }, String(shown)));
  }
  const path = (list) => list.map((p, i) => `${i ? "L" : "M"}${x(p)} ${y(p.value)}`).join(" ");
  svg.append(svgElement("path", { d: path(points), class: options.average ? "series faint" : "series" }));
  if (options.average) svg.append(svgElement("path", { d: path(options.average), class: "series average" }));

  const show = (p, i) => {
    const smooth = options.average ? ` (7-day average ${format(options.average[i].value)})` : "";
    readout.textContent = `${niceDate(p.date)}: ${format(p.value)}${smooth}`;
  };
  points.forEach((p, i) => {
    const dot = svgElement("circle", { cx: x(p), cy: y(p.value), r: 3.5, class: "point" });
    const hit = svgElement("circle", { cx: x(p), cy: y(p.value), r: 12, class: "hit" });
    ["pointerenter", "click"].forEach((type) => hit.addEventListener(type, () => show(p, i)));
    svg.append(dot, hit);
  });
  svg.append(svgElement("text", { x: left, y: height - 6 }, shortDate(parseDate(points[0].date), true)));
  if (span) svg.append(svgElement("text", { x: width - right, y: height - 6, "text-anchor": "end" }, shortDate(parseDate(points[points.length - 1].date), true)));
  show(points[points.length - 1], points.length - 1);
  return [readout, svg];
}

// Draws a bar chart with SVG. Each bar has { minutes (its value), label, name }.
// Without options it shows workout time; options change how other numbers are written.
function barChart(bars, readout, options = {}) {
  const format = options.format || durationText;
  const axis = options.axis || format;
  const width = 340, height = 190, left = 44, top = 8, bottom = 22;
  const plotW = width - left - 2;
  const plotH = height - top - bottom;

  const draw = svgElement;

  // Pick round gridline steps so there are at most four
  const biggest = Math.max(...bars.map((b) => b.minutes), 60);
  const step = options.format
    ? roundStep(biggest)
    : [15, 30, 60, 120, 300, 600, 1200, 1800, 3000, 6000, 12000, 30000].find((s) => biggest / s <= 4) || Math.ceil(biggest / 4);
  const max = Math.ceil(biggest / step) * step;

  const svg = draw("svg", { viewBox: `0 0 ${width} ${height}`, class: "chart", role: "group", "aria-label": options.label || "Bar chart of workout time" });
  for (let value = 0; value <= max; value += step) {
    const y = top + plotH - (value / max) * plotH;
    svg.append(
      draw("line", { x1: left, x2: width - 2, y1: y, y2: y, class: "grid" }),
      draw("text", { x: left - 5, y: y + 3, "text-anchor": "end" }, axis(value))
    );
  }

  const slot = plotW / bars.length;
  const barW = Math.min(slot * 0.7, 36);
  bars.forEach((bar, i) => {
    const x = left + i * slot;
    const h = bar.minutes ? Math.max((bar.minutes / max) * plotH, 2) : 0;
    const group = draw("g", { class: "bar", tabindex: "0", "aria-label": `${bar.name}: ${format(bar.minutes)}` });
    group.append(
      draw("rect", { x, y: top, width: slot, height: plotH, class: "hit" }), // large tap area
      draw("rect", { x: x + (slot - barW) / 2, y: top + plotH - h, width: barW, height: h, rx: 2, class: "fill" })
    );
    const show = () => {
      svg.querySelectorAll(".bar").forEach((g) => g.classList.remove("selected"));
      group.classList.add("selected");
      readout.textContent = `${bar.name}: ${format(bar.minutes)}`;
    };
    ["pointerenter", "click", "focus"].forEach((type) => group.addEventListener(type, show));
    svg.append(group);
    if (bar.label) svg.append(draw("text", { x: x + slot / 2, y: height - 7, "text-anchor": "middle" }, bar.label));
  });
  return svg;
}
