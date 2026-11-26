import { element } from "./ui.js";

const COLORS = ["var(--chart-primary)", "var(--chart-secondary)"];
let nextChart = 0;
const svgNode = (tag, attributes = {}, text) => {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
};
const tick = value => new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);

function chart(title, rows, xKey, xLabel, unit, lines) {
  const figure = element("figure", undefined, "chart");
  figure.append(element("h3", title));
  const available = rows.flatMap(row => lines.map(line => row[line.key])).filter(Number.isFinite);
  if (!available.length) {
    figure.append(element("p", "Sensor data unavailable. No values have been filled in.", "caption"));
    return figure;
  }
  const width = 620, height = 265, left = 75, top = 20, right = 20, bottom = 55;
  const minX = rows[0][xKey], maxX = rows.at(-1)[xKey];
  const maxY = unit === "%" ? 100 : (Math.max(...available) * 1.08 || 1);
  const x = value => left + (value - minX) / (maxX - minX || 1) * (width - left - right);
  const y = value => height - bottom - value / maxY * (height - top - bottom);
  const id = `chart-${++nextChart}`;
  const svg = svgNode("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-labelledby": `${id}-title ${id}-description` });
  svg.append(svgNode("title", { id: `${id}-title` }, `${title} (${unit})`),
    svgNode("desc", { id: `${id}-description` }, `Bucket means against ${xLabel}. Open Chart data below for numeric values. Missing sensors are gaps.`));
  for (let i = 0; i <= 4; i++) {
    const value = maxY * i / 4;
    svg.append(svgNode("line", { x1: left, y1: y(value), x2: width - right, y2: y(value), class: "chart-grid" }),
      svgNode("text", { x: left - 8, y: y(value) + 4, "text-anchor": "end" }, tick(value)));
  }
  for (const value of [...new Set([minX, (minX + maxX) / 2, maxX])]) {
    svg.append(svgNode("text", { x: x(value), y: height - bottom + 21,
      "text-anchor": value === minX ? "start" : value === maxX ? "end" : "middle" }, tick(value)));
  }
  svg.append(svgNode("text", { x: left, y: 12 }, unit),
    svgNode("text", { x: (width + left - right) / 2, y: height - 6, "text-anchor": "middle" }, xLabel));
  lines.forEach((line, index) => {
    let path = "", connected = false;
    for (const row of rows) {
      if (!Number.isFinite(row[line.key])) { connected = false; continue; }
      path += `${connected ? "L" : "M"}${x(row[xKey]).toFixed(2)},${y(row[line.key]).toFixed(2)} `;
      connected = true;
      const point = svgNode("circle", { cx: x(row[xKey]), cy: y(row[line.key]), r: rows.length < 20 ? 3 : 1.8, fill: COLORS[index] });
      point.append(svgNode("title", {}, `${line.label}: ${tick(row[line.key])} ${unit}; ${xLabel}: ${tick(row[xKey])}`));
      svg.append(point);
    }
    svg.append(svgNode("path", { d: path, fill: "none", stroke: COLORS[index], "stroke-width": 2,
      ...(index ? { "stroke-dasharray": "6 4" } : {}) }));
  });
  figure.append(svg);
  const caption = element("figcaption");
  lines.forEach((line, i) => {
    const label = element("span", `${i ? " / " : ""}${line.label}${i ? " (dashed)" : ""}`);
    label.style.color = COLORS[i]; caption.append(label);
  });
  figure.append(caption);
  const details = element("details"), table = element("table"), head = element("thead"), header = element("tr");
  details.append(element("summary", "Chart data (bucket means)"));
  for (const label of [xLabel, ...lines.map(line => `${line.label} (${unit})`)]) {
    const cell = element("th", label); cell.scope = "col"; header.append(cell);
  }
  head.append(header); table.append(head);
  const body = element("tbody");
  for (const row of rows) {
    const tr = element("tr");
    for (const value of [row[xKey], ...lines.map(line => row[line.key])]) tr.append(element("td", value === null ? "unavailable" : tick(value)));
    body.append(tr);
  }
  table.append(body);
  const wrap = element("div", undefined, "chart-data"); wrap.tabIndex = 0;
  wrap.setAttribute("aria-label", `${title} numeric chart data`); wrap.append(table); details.append(wrap); figure.append(details);
  return figure;
}

export function reportCharts(report) {
  const container = element("section");
  container.append(element("h2", "Performance over the run"));
  if (!report.history) {
    container.append(element("p", "This older submission has no chart data. Reimport the original report to add graphs.", "notice"));
    return container;
  }
  const history = report.history;
  container.append(element("p", `Charts use up to 120 contiguous bucket means from ${report.frames.toLocaleString()} frames` +
    ` and ${history.telemetry_samples.toLocaleString()} telemetry samples. FPS is 1000 / mean frame ms. ` +
    "Frame statistics use the full CSV; averaged charts can hide short spikes. Missing sensors are gaps, not zeros.", "caption"));
  const grid = element("div", undefined, "chart-grid-layout");
  const frames = history.frames.map(bucket => ({ ...bucket, frame: (bucket.first + bucket.last) / 2, fps: 1000 / bucket.wall_ms }));
  grid.append(chart("Captured FPS", frames, "frame", "Source frame", "FPS", [{ key: "fps", label: "Capture (not gameplay)" }]),
    chart("Frame time", frames, "frame", "Source frame", "ms", [
      { key: "wall_ms", label: "Capture wall time" }, ...(report.gpu_ms === null ? [] : [{ key: "gpu_ms", label: "PT GPU time" }])
    ]));
  if (!history.telemetry.length) container.append(element("p", "GPU sensor charts unavailable: telemetry.csv was not included.", "notice"));
  else for (const [title, key, unit] of [
    ["GPU temperature", "temperature_c", "C"], ["GPU utilization", "utilization_pct", "%"],
    ["GPU power", "power_w", "W"], ["Video memory used", "memory_mib", "MiB"]
  ]) grid.append(chart(title, history.telemetry, "elapsed_s", "Elapsed capture time (s)", unit, [{ key, label: title }]));
  if (history.telemetry.length) grid.append(chart("GPU clocks", history.telemetry, "elapsed_s", "Elapsed capture time (s)", "MHz", [
    { key: "sm_clock_mhz", label: "SM clock" }, { key: "memory_clock_mhz", label: "Memory clock" }
  ]));
  container.append(grid);
  return container;
}
