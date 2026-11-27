const MODELS = ["PT_PHYSICAL", "legacy", "OpenGL"];
const PACINGS = ["uncapped", "capped_30hz"];
const BACKENDS = ["cuda", "opencl", "opengl"];
const STRING_SETTINGS = new Set(["r_ptPreset", "r_ptBackend", "r_renderer"]);

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function number(value, name, minimum = 0, maximum = 1e15, integer = false) {
  requireValue(value !== null && value !== undefined &&
    !(typeof value === "string" && value.trim() === ""), `${name} is missing.`);
  requireValue(typeof value === "number" || typeof value === "string", `${name} must be numeric.`);
  const result = Number(value);
  requireValue(Number.isFinite(result) && result >= minimum && result <= maximum &&
    (!integer || Number.isSafeInteger(result)), `${name} is invalid.`);
  return result;
}

function text(value, name, maximum = 160) {
  requireValue(typeof value === "string" && value.trim().length > 0 &&
    value.length <= maximum && !/[\u0000-\u001f\u007f]/.test(value), `${name} is invalid.`);
  return value.trim();
}

export function parseCsv(input) {
  requireValue(typeof input === "string", "CSV input must be text.");
  const rows = [];
  let row = [], field = "", quoted = false, closed = false;
  const value = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quoted) {
      if (c === '"' && value[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === '"') {
      requireValue(field === "" && !closed, "Malformed CSV quote.");
      quoted = true;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(field); field = ""; closed = false;
      if (c !== ",") {
        if (row.some(cell => cell !== "")) rows.push(row);
        row = [];
        if (c === "\r" && value[i + 1] === "\n") i++;
      }
    } else {
      requireValue(!closed, "Unexpected text after a CSV quote.");
      field += c;
    }
  }
  requireValue(!quoted, "Unterminated CSV quote.");
  if (field !== "" || row.length || closed) { row.push(field); rows.push(row); }
  requireValue(rows.length >= 2, "CSV needs a header and at least one frame.");
  const headers = rows.shift();
  requireValue(headers.every(Boolean) && new Set(headers).size === headers.length, "CSV headers are missing or duplicated.");
  return rows.map((cells, i) => {
    requireValue(cells.length === headers.length, `CSV row ${i + 2} has the wrong column count.`);
    return Object.fromEntries(headers.map((key, index) => [key, cells[index]]));
  });
}

function sanitizeSettings(input) {
  requireValue(input && typeof input === "object" && !Array.isArray(input), "Renderer settings are missing.");
  const settings = {}, omitted = [];
  for (const key of Object.keys(input).sort()) {
    if (!/^r_[A-Za-z0-9_]+$/.test(key) && !["com_fixedTic", "g_stopTime"].includes(key)) continue;
    const value = input[key];
    if (value === "") continue;
    if ((typeof value === "number" || typeof value === "string") &&
        /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(String(value)) && Number.isFinite(Number(value))) {
      settings[key] = Number(value);
    } else if (STRING_SETTINGS.has(key) && typeof value === "string" && /^[A-Za-z0-9_.+-]{1,80}$/.test(value)) {
      settings[key] = value;
    } else omitted.push(key);
  }
  requireValue(Object.keys(settings).length > 0, "No usable renderer settings were found.");
  return { settings, omitted };
}

export function validateSubmission(input) {
  requireValue(input && input.kind === "doom3-pt-benchmark" && input.schema_version === 1,
    "Unsupported submission format.");
  const model = text(input.model, "Renderer model", 32);
  requireValue(MODELS.includes(model), "Unknown renderer model.");
  const source = text(input.source, "Demo source", 180);
  requireValue(/^demos\/[A-Za-z0-9_./-]+\.demo$/.test(source) && !source.includes(".."),
    "Use a relative demos/...demo source.");
  const fingerprint = text(input.fingerprint, "Demo fingerprint", 16).toLowerCase();
  requireValue(/^[a-f0-9]{16}$/.test(fingerprint), "The demo fingerprint must contain 16 hexadecimal digits.");
  const revision = text(input.revision, "Source revision", 64);
  requireValue(/^[A-Za-z0-9_.+-]+$/.test(revision), "Source revision contains unexpected characters.");
  const { settings, omitted } = sanitizeSettings(input.settings);
  requireValue(Array.isArray(input.omitted_settings) && input.omitted_settings.every(key =>
    typeof key === "string" && /^r_[A-Za-z0-9_]+$/.test(key)), "Invalid omitted-settings list.");
  const omittedSettings = [...new Set([...omitted, ...input.omitted_settings])].sort();
  const gl = model === "OpenGL";
  const spp = gl ? 0 : number(input.spp, "Samples per pixel", 1, 100000, true);
  const batch = gl ? 0 : number(input.batch, "Samples per dispatch", 1, spp, true);
  const dispatches = gl ? 0 : number(input.dispatches_per_frame, "Dispatches per frame", 1, 100000, true);
  requireValue(gl || batch * dispatches === spp, "Sample and dispatch budgets disagree.");
  requireValue(!gl || (input.spp === 0 && input.batch === 0 && input.dispatches_per_frame === 0 &&
    input.gpu_ms === null), "GL must not claim PT/GPU metrics.");
  requireValue(PACINGS.includes(input.pacing), "Benchmark pacing is missing; rerun with a current build.");
  requireValue(typeof input.save_images === "boolean", "Benchmark image-saving flag is missing; rerun with a current build.");
  requireValue(BACKENDS.includes(input.backend) && (input.backend === "opengl") === gl, "Invalid compute backend.");
  const report = {
    kind: "doom3-pt-benchmark", schema_version: 1, model, source, fingerprint, revision,
    gpu: text(input.gpu, "GPU"), cpu: text(input.cpu, "CPU"), platform: text(input.platform, "Platform", 80),
    driver: text(input.driver, "Driver", 80),
    frames: number(input.frames, "Frame count", 1, 1000000, true),
    width: number(input.width, "Image width", 1, 16384, true),
    height: number(input.height, "Image height", 1, 16384, true),
    spp, batch, dispatches_per_frame: dispatches,
    backend: input.backend, pacing: input.pacing, save_images: input.save_images,
    wall_ms: number(input.wall_ms, "Total captured-frame wall time", 0.000001),
    gpu_ms: gl ? null : number(input.gpu_ms, "Total GPU time", 0.000001),
    settings, omitted_settings: omittedSettings
  };
  if (input.recorded_unix_s !== undefined) report.recorded_unix_s = number(input.recorded_unix_s, "Recording date", 1, 1e11, true);
  if (input.hardware !== undefined) {
    requireValue(input.hardware && typeof input.hardware === "object" && !Array.isArray(input.hardware), "Invalid hardware details.");
    report.hardware = {};
    for (const key of ["ram_mb", "vram_bytes", "logical_cores", "cuda_driver", "cuda_runtime"]) {
      if (input.hardware[key] !== undefined) report.hardware[key] = number(input.hardware[key], key, 0);
    }
  }
  if (input.history !== undefined) report.history = validateHistory(input.history, report);
  return report;
}

function closeTotal(actual, expected, label) {
  const target = number(expected, label, 0.000001);
  requireValue(Math.abs(actual - target) <= Math.max(1, target * 0.00001), `${label} disagrees with frames.csv.`);
}

const HISTORY_LIMIT = 120;
const SENSORS = {
  temperature_c: ["gpu_temperature_c", 150], power_w: ["gpu_power_w", 10000],
  utilization_pct: ["gpu_utilization_pct", 100], memory_mib: ["gpu_memory_used_bytes", 1e15],
  sm_clock_mhz: ["gpu_sm_clock_mhz", 100000], memory_clock_mhz: ["gpu_memory_clock_mhz", 100000]
};

function buckets(rows, summarize) {
  const count = Math.min(rows.length, HISTORY_LIMIT), result = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * rows.length / count), end = Math.floor((i + 1) * rows.length / count);
    result.push(summarize(rows.slice(start, end), start, end));
  }
  return result;
}

function mean(values) {
  const available = values.filter(value => value !== null);
  return available.length ? Number((available.reduce((a, b) => a + b, 0) / available.length).toFixed(6)) : null;
}

function validateHistory(input, report) {
  requireValue(input && Array.isArray(input.frames) && input.frames.length >= 1 &&
    input.frames.length <= HISTORY_LIMIT, "Invalid frame chart data.");
  let next = 1, wall = 0, gpu = 0;
  const frames = input.frames.map(bucket => {
    const first = number(bucket.first, "Bucket first frame", 1, report.frames, true);
    const last = number(bucket.last, "Bucket last frame", first, report.frames, true);
    requireValue(first === next, "Frame chart buckets must be contiguous.");
    next = last + 1;
    const wallMs = number(bucket.wall_ms, "Bucket wall time", 0.000001);
    const gpuMs = report.model === "OpenGL" ? null : number(bucket.gpu_ms, "Bucket GPU time", 0.000001);
    requireValue(report.model !== "OpenGL" || bucket.gpu_ms === null, "GL chart GPU time must be unavailable.");
    wall += wallMs * (last - first + 1); gpu += (gpuMs || 0) * (last - first + 1);
    return { first, last, wall_ms: wallMs, gpu_ms: gpuMs };
  });
  requireValue(next === report.frames + 1, "Frame chart does not cover the full report.");
  closeTotal(wall, report.wall_ms, "Chart wall time");
  if (report.gpu_ms !== null) closeTotal(gpu, report.gpu_ms, "Chart GPU time");
  const stats = input.stats;
  requireValue(stats && typeof stats === "object", "Frame statistics are missing.");
  const normalizedStats = {};
  for (const key of ["min_ms", "median_ms", "p95_ms", "max_ms"]) normalizedStats[key] = number(stats[key], key, 0.000001);
  requireValue(normalizedStats.min_ms <= normalizedStats.median_ms && normalizedStats.median_ms <= normalizedStats.p95_ms &&
    normalizedStats.p95_ms <= normalizedStats.max_ms, "Invalid frame statistics order.");
  requireValue(report.wall_ms / report.frames >= normalizedStats.min_ms - 0.001 &&
    report.wall_ms / report.frames <= normalizedStats.max_ms + 0.001, "Frame statistics disagree with the average.");
  requireValue(Array.isArray(input.telemetry) && input.telemetry.length <= HISTORY_LIMIT, "Invalid telemetry chart data.");
  let previous = -1;
  const telemetry = input.telemetry.map(bucket => {
    const elapsed = number(bucket.elapsed_s, "Telemetry elapsed time");
    requireValue(elapsed > previous, "Telemetry chart times must increase.");
    previous = elapsed;
    const point = { elapsed_s: elapsed };
    for (const [key, [, max]] of Object.entries(SENSORS)) {
      point[key] = bucket[key] === null ? null : number(bucket[key], key, 0, key === "memory_mib" ? max / 1048576 : max);
    }
    return point;
  });
  const samples = number(input.telemetry_samples, "Telemetry sample count", telemetry.length, 1000000, true);
  requireValue((samples === 0) === (telemetry.length === 0), "Telemetry sample count disagrees with chart data.");
  return { frames, stats: normalizedStats, telemetry, telemetry_samples: samples };
}

function importHistory(rows, telemetryCsv, metadata, gl) {
  const times = rows.map(row => Number(row.frame_wall_ms)).sort((a, b) => a - b);
  const half = Math.floor(times.length / 2);
  const history = {
    frames: buckets(rows, (part, start, end) => ({ first: start + 1, last: end,
      wall_ms: mean(part.map(row => Number(row.frame_wall_ms))),
      gpu_ms: gl ? null : mean(part.map(row => Number(row.gpu_ms))) })),
    stats: { min_ms: times[0], median_ms: times.length % 2 ? times[half] : (times[half - 1] + times[half]) / 2,
      p95_ms: times[Math.ceil(times.length * 0.95) - 1], max_ms: times.at(-1) },
    telemetry: [], telemetry_samples: 0
  };
  if (telemetryCsv === null) return history;
  requireValue(["complete", "complete_partial_sensors"].includes(metadata.telemetry_status),
    "This metadata does not report completed telemetry. Omit telemetry.csv if sensors were unavailable.");
  const telemetry = parseCsv(telemetryCsv);
  requireValue(telemetry.length <= 1000000, "Too many telemetry samples.");
  let previous = -1;
  const points = telemetry.map(row => {
    const elapsed = number(row.elapsed_s, "Telemetry elapsed time", 0, number(metadata.elapsed_s, "Capture elapsed time") + 2);
    requireValue(elapsed > previous, "Telemetry samples must be in increasing time order.");
    previous = elapsed;
    number(row.source_frame, "Telemetry source frame", 0, rows.length, true);
    const point = { elapsed_s: elapsed };
    for (const [key, [column, max]] of Object.entries(SENSORS)) {
      requireValue(Object.hasOwn(row, column), `Telemetry is missing ${column}.`);
      point[key] = row[column] === "" ? null : number(row[column], column, 0, max) / (key === "memory_mib" ? 1048576 : 1);
    }
    return point;
  });
  history.telemetry_samples = points.length;
  history.telemetry = buckets(points, part => Object.fromEntries(["elapsed_s", ...Object.keys(SENSORS)]
    .map(key => [key, mean(part.map(point => point[key]))])));
  return history;
}

export function importReport(metadata, csv, driver = "not reported", telemetryCsv = null) {
  requireValue(metadata?.schema_version === 1 && metadata.status === "completed" &&
    metadata.mode === "benchmark", "Choose a completed schema-1 benchmark, not a partial run or sequence.");
  const rows = parseCsv(csv);
  requireValue(rows.length === number(metadata.completed_rows, "Completed rows", 1, 1000000, true),
    "The report frame count does not match frames.csv.");
  const gl = metadata.rendering_model === "OpenGL";
  const first = rows[0], width = number(first.image_width, "Image width", 1, 16384, true);
  const height = number(first.image_height, "Image height", 1, 16384, true);
  const spp = gl ? 0 : number(metadata.requested_spp, "Requested spp", 1, 100000, true);
  const batch = gl ? 0 : number(metadata.capture_batch_spp, "Capture batch", 1, spp, true);
  const dispatches = gl ? 0 : number(metadata.capture_target_dispatches, "Capture dispatches", 1, 100000, true);
  if (gl) requireValue(metadata.requested_spp === null && metadata.capture_batch_spp === null &&
    metadata.capture_target_dispatches === null && metadata.gpu_total_ms === null &&
    metadata.gpu_stage_timing === false, "GL metadata incorrectly claims PT/GPU metrics.");
  else requireValue(metadata.gpu_stage_timing === true, "PT metadata must report GPU-stage timing.");
  let wall = 0, gpu = 0;
  rows.forEach((row, i) => {
    requireValue(number(row.frame, "Frame index", 1, 1000000, true) === i + 1 &&
      number(row.source_frame, "Source frame", 1, 1000000, true) === i + 1, "Source frames must be contiguous, starting at 1.");
    requireValue(Math.abs(number(row.source_time_s, "Source time") - i / 30) < 0.000002,
      "Source timestamps do not match 30 Hz demo replay.");
    requireValue(row.phase === (gl ? "opengl" : "pathtrace"), "Unexpected capture phase.");
    requireValue(number(row.image_width, "Frame width") === width && number(row.image_height, "Frame height") === height &&
      number(row.trace_width, "Trace width") === width && number(row.trace_height, "Trace height") === height,
      "Image or trace dimensions change within the run.");
    requireValue(number(row.spp, "Frame spp") === spp && number(row.dispatches, "Frame dispatches") === dispatches,
      "Samples or dispatches change within the run.");
    wall += number(row.frame_wall_ms, "Frame wall time", 0.000001);
    if (gl) requireValue(row.gpu_ms === "", "GL GPU time must be unavailable, not zero.");
    else gpu += number(row.gpu_ms, "Frame GPU time", 0.000001);
  });
  closeTotal(wall, metadata.frame_wall_total_ms, "Total frame wall time");
  requireValue(PACINGS.includes(metadata.benchmark_pacing) && typeof metadata.benchmark_save_images === "boolean",
    "This report has no benchmark pacing/image fields. Rerun the benchmark with a current build.");
  if (!gl) closeTotal(gpu, metadata.gpu_total_ms, "Total GPU time");
  const sanitized = sanitizeSettings(metadata.settings_effective);
  return validateSubmission({
    kind: "doom3-pt-benchmark", schema_version: 1, model: metadata.rendering_model,
    source: metadata.source, fingerprint: metadata.source_fingerprint_fnv1a64,
    revision: metadata.renderer_revision, gpu: metadata.gpu?.name,
    cpu: metadata.cpu_model || "not reported", platform: metadata.platform,
    driver: driver.trim() || "not reported", frames: rows.length, width, height,
    spp, batch, dispatches_per_frame: dispatches, wall_ms: wall, gpu_ms: gl ? null : gpu,
    backend: gl ? "opengl" : metadata.gpu?.api === "opencl" ? "opencl" : "cuda",
    pacing: metadata.benchmark_pacing, save_images: metadata.benchmark_save_images,
    settings: sanitized.settings, omitted_settings: sanitized.omitted,
    ...(metadata.started_unix_s === undefined ? {} : { recorded_unix_s: metadata.started_unix_s }),
    hardware: {
      ...(metadata.system_ram_mb === undefined ? {} : { ram_mb: metadata.system_ram_mb }),
      ...(metadata.cpu_logical_cores === undefined ? {} : { logical_cores: metadata.cpu_logical_cores }),
      ...(metadata.gpu?.total_memory_bytes === undefined ? {} : { vram_bytes: metadata.gpu.total_memory_bytes }),
      ...(metadata.gpu?.cuda_driver_version === undefined ? {} : { cuda_driver: metadata.gpu.cuda_driver_version }),
      ...(metadata.gpu?.cuda_runtime_version === undefined ? {} : { cuda_runtime: metadata.gpu.cuda_runtime_version })
    },
    history: importHistory(rows, telemetryCsv, metadata, gl)
  });
}

export function isRankable(report) {
  return /^[a-f0-9]{7,40}$/i.test(report.revision) && report.omitted_settings.length === 0;
}

export function compatibilityKey(report) {
  return JSON.stringify([report.revision, report.model, report.source, report.fingerprint,
    report.frames, report.width, report.height, report.spp, report.batch, report.dispatches_per_frame,
    report.backend, report.pacing, report.save_images,
    Object.entries(report.settings).sort(([a], [b]) => a.localeCompare(b))]);
}

export function capturedFps(report) {
  return report.frames * 1000 / report.wall_ms;
}

export function reportId(entry) {
  const match = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/([1-9]\d*)$/.exec(entry.issue);
  requireValue(match, "Invalid source issue URL.");
  return `${match[1]}/${match[2]}/${match[3]}`;
}

export function submissionMarkdown(report) {
  const markdown = `## Benchmark submission\n\n\`\`\`json\n${JSON.stringify(validateSubmission(report), null, 2)}\n\`\`\`\n\n` +
    "### Reviewed report archive\n\nAttach a ZIP containing metadata.json, frames.csv, settings.csv and optional telemetry.csv. " +
    "Review/redact local paths and arguments first. No game assets or keys.\n\n" +
    "### Preview\n\nDrag a representative PNG/JPEG/WebP here. Please do not remove the JSON above.\n\n" +
    "### Notes\n\nGPU driver, custom assets/mods, power settings, and any rendering problems:\n";
  requireValue(markdown.length <= 64000, "The summary exceeds GitHub's issue size limit. Reduce unrelated renderer settings before preparing a submission.");
  return markdown;
}

export function safePreviewUrl(value) {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    if (url.hostname === "github.com" && /^\/user-attachments\/assets\/[a-f0-9-]+$/i.test(url.pathname)) return url.href;
    if (url.hostname === "user-images.githubusercontent.com" && /^\/[\w./-]+\.(png|jpe?g|webp)$/i.test(url.pathname)) return url.href;
  } catch { return null; }
  return null;
}
