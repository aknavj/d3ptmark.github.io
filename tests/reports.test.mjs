import test from "node:test";
import assert from "node:assert/strict";
import { importReport, parseCsv, validateSubmission, isRankable, compatibilityKey,
  capturedFps, submissionMarkdown, safePreviewUrl, reportId } from "../assets/js/reports.js";
import { collectSubmissions, fetchApproved, writeReportFiles } from "../scripts/sync-submissions.mjs";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

function fixture(gl = false) {
  const metadata = {
    schema_version: 1, status: "completed", mode: "benchmark",
    source: "demos/demo1.demo", source_fingerprint_fnv1a64: "b3debb3af436474b",
    renderer_revision: "191e491", rendering_model: gl ? "OpenGL" : "PT_PHYSICAL",
    gpu: { name: "Test GPU" }, cpu_model: "Test CPU", platform: "linux",
    completed_rows: 2, requested_spp: gl ? null : 8, capture_batch_spp: gl ? null : 4,
    capture_target_dispatches: gl ? null : 2, gpu_stage_timing: !gl,
    gpu_total_ms: gl ? null : 2500, frame_wall_total_ms: 5000,
    startup_argv: ["/home/private", "do-not-publish-this"],
    settings_effective: { r_ptRenderScale: "1", r_ptPreset: "cinematic_low", r_ptDraw: gl ? "0" : "1" }
  };
  const headers = ["frame", "source_frame", "source_time_s", "phase", "spp", "dispatches",
    "trace_width", "trace_height", "image_width", "image_height", "gpu_ms", "frame_wall_ms", "image_file"];
  const rows = [0, 1].map(i => ({
    frame: i + 1, source_frame: i + 1, source_time_s: (i / 30).toFixed(6),
    phase: gl ? "opengl" : "pathtrace", spp: gl ? 0 : 8, dispatches: gl ? 0 : 2,
    trace_width: 800, trace_height: 600, image_width: 800, image_height: 600,
    gpu_ms: gl ? "" : i ? 1500 : 1000, frame_wall_ms: i ? 3000 : 2000,
    image_file: "/home/private/screenshot.png"
  }));
  const csv = () => headers.join(",") + "\n" + rows.map(row => headers.map(key =>
    `"${String(row[key]).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
  return { metadata, rows, csv };
}

test("imports a complete PT report, recomputes captured fps, and omits private fields", () => {
  const f = fixture(), r = importReport(f.metadata, f.csv());
  assert.equal(r.frames, 2); assert.equal(r.gpu_ms, 2500); assert.equal(capturedFps(r), 0.4);
  assert.equal(r.driver, "not reported"); assert.ok(isRankable(r));
  assert.doesNotMatch(JSON.stringify(r), /home|private|startup_argv|image_file|do-not-publish/);
  assert.deepEqual(validateSubmission({ ...r, password: "discard" }), r);
});

test("accepts legacy and GL as separate models without manufacturing GL GPU metrics", () => {
  const f = fixture(); f.metadata.rendering_model = "legacy";
  assert.equal(importReport(f.metadata, f.csv()).model, "legacy");
  const g = fixture(true), r = importReport(g.metadata, g.csv());
  assert.equal(r.gpu_ms, null); assert.equal(r.spp, 0); assert.equal(r.batch, 0);
  g.rows[0].gpu_ms = 0;
  assert.throws(() => importReport(g.metadata, g.csv()), /unavailable/);
});

test("CSV supports BOM, CRLF, commas, escaped quotes and embedded newlines", () => {
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n"one,two","a""b"\r\nthree,"line\nbreak"\r\n'),
    [{ a: "one,two", b: 'a"b' }, { a: "three", b: "line\nbreak" }]);
});

for (const csv of ['a,a\n1,2', 'a,b\n1', 'a,b\n"bad,2', 'a,b\n"x"junk,2', 'a,b\nun"quoted,2']) {
  test(`rejects malformed CSV: ${JSON.stringify(csv)}`, () => assert.throws(() => parseCsv(csv)));
}

const invalidMetadata = {
  partial: m => { m.status = "aborted"; },
  sequence: m => { m.mode = "sequence"; },
  schema: m => { m.schema_version = 2; },
  rowCount: m => { m.completed_rows = 3; },
  wallTotal: m => { m.frame_wall_total_ms = 6000; },
  gpuTotal: m => { m.gpu_total_ms = 3500; },
  samples: m => { m.requested_spp = 64; },
  batch: m => { m.capture_batch_spp = 3; },
  model: m => { m.rendering_model = "fake"; },
  fingerprint: m => { m.source_fingerprint_fnv1a64 = "missing"; },
  sourcePath: m => { m.source = "/home/private/demo.demo"; }
};
for (const [label, change] of Object.entries(invalidMetadata)) {
  test(`rejects invalid metadata: ${label}`, () => {
    const f = fixture(); change(f.metadata);
    assert.throws(() => importReport(f.metadata, f.csv()));
  });
}

const invalidFrames = {
  index: rows => { rows[1].frame = 3; },
  sourceFrame: rows => { rows[1].source_frame = 3; },
  time: rows => { rows[1].source_time_s = 1; },
  dimension: rows => { rows[1].image_width = 400; },
  traceDimension: rows => { rows[1].trace_height = 300; },
  spp: rows => { rows[1].spp = 4; },
  dispatches: rows => { rows[1].dispatches = 4; },
  phase: rows => { rows[0].phase = "image_save"; },
  missingTime: rows => { rows[0].source_time_s = " "; },
  nonfinite: rows => { rows[1].gpu_ms = "Infinity"; },
  negative: rows => { rows[1].frame_wall_ms = -1; }
};
for (const [label, change] of Object.entries(invalidFrames)) {
  test(`rejects invalid frame data: ${label}`, () => {
    const f = fixture(); change(f.rows);
    assert.throws(() => importReport(f.metadata, f.csv()));
  });
}

test("dirty and unknown revisions are accepted only as unranked development data", () => {
  const f = fixture();
  for (const revision of ["191e491-dirty", "unknown"]) {
    f.metadata.renderer_revision = revision;
    assert.equal(isRankable(importReport(f.metadata, f.csv())), false);
  }
});

test("non-numeric settings cannot leak paths or silently become comparable", () => {
  const f = fixture();
  f.metadata.settings_effective.r_customFile = "/home/private/map";
  const r = importReport(f.metadata, f.csv());
  assert.deepEqual(r.omitted_settings, ["r_customFile"]);
  assert.doesNotMatch(JSON.stringify(r), /home|private/);
  assert.equal(isRankable(r), false);
});

test("compatibility grouping changes with quality, revision, model, demo, frames and budget", () => {
  const f = fixture(), r = importReport(f.metadata, f.csv());
  for (const change of [{ revision: "abcdef0" }, { model: "legacy" }, { fingerprint: "a".repeat(16) },
    { source: "demos/custom.demo" }, { frames: 1 }, { width: 400 }, { height: 300 },
    { spp: 16 }, { batch: 1 }, { dispatches_per_frame: 4 }, { settings: { ...r.settings, r_ptRenderScale: 0.5 } }]) {
    assert.notEqual(compatibilityKey(r), compatibilityKey({ ...r, ...change }));
  }
  assert.equal(compatibilityKey(r), compatibilityKey({ ...r, gpu: "A different GPU", cpu: "A different CPU" }));
});

test("generated Markdown round-trips through the manually approved issue gate", () => {
  const f = fixture(), report = importReport(f.metadata, f.csv());
  const body = submissionMarkdown(report);
  const issue = { number: 7, labels: [{ name: "benchmark-approved" }], user: { login: "tester" }, body };
  assert.deepEqual(collectSubmissions([issue], "owner/repo")[0].report, report);
  assert.deepEqual(collectSubmissions([{ ...issue, state: "closed" }], "owner/repo")[0].report, report);
  assert.deepEqual(collectSubmissions([{ ...issue, labels: [] }], "owner/repo"), []);
  assert.deepEqual(collectSubmissions([{ ...issue, state: "closed", labels: [] }], "owner/repo"), []);
  assert.deepEqual(collectSubmissions([{ ...issue, pull_request: {} }], "owner/repo"), []);
});

test("invalid or ambiguous approved issues are logged and excluded", () => {
  const f = fixture(), report = importReport(f.metadata, f.csv());
  const warnings = [], base = { number: 2, labels: [{ name: "benchmark-approved" }], user: { login: "tester" } };
  const rows = collectSubmissions([
    { ...base, body: "not JSON" },
    { ...base, body: submissionMarkdown(report).repeat(2) },
    { ...base, body: "```json\n{\"kind\":\"bad\"}\n```" }
  ], "owner/repo", message => warnings.push(message));
  assert.deepEqual(rows, []); assert.equal(warnings.length, 3);
});

const imageUrl = "https://github.com/user-attachments/assets/00000000-0000-0000-0000-000000000001";
test("only public, query-free GitHub preview URLs are allowed", () => {
  assert.equal(safePreviewUrl(imageUrl), imageUrl);
  assert.ok(safePreviewUrl("https://user-images.githubusercontent.com/1/image.png"));
  for (const url of ["javascript:alert(1)", "https://tracker.test/pixel.png",
    imageUrl + "?token=secret", imageUrl + "#x", "https://name:secret@github.com/user-attachments/assets/abc",
    "https://github.com.evil.test/user-attachments/assets/abc", "data:image/svg+xml,bad"]) {
    assert.equal(safePreviewUrl(url), null);
  }
});

test("approved issue image extraction accepts GitHub Markdown and HTML but never fetches it", () => {
  const f = fixture(), body = submissionMarkdown(importReport(f.metadata, f.csv()));
  for (const image of [`![preview](${imageUrl})`, `<img alt="preview" src="${imageUrl}" />`]) {
    const entry = collectSubmissions([{ number: 1, user: { login: "tester" },
      labels: [{ name: "benchmark-approved" }], body: body + image }], "owner/repo")[0];
    assert.equal(entry.preview, imageUrl);
  }
});

test("GitHub pagination is followed without downloading attachments", async () => {
  const urls = [];
  const issues = await fetchApproved("owner/repo", null, async url => {
    urls.push(url); return { ok: true, json: async () => urls.length === 1 ? Array(100).fill({}) : [{}] };
  });
  assert.equal(issues.length, 101); assert.equal(urls.length, 2);
  assert.match(urls[1], /page=2$/);
  assert.ok(urls.every(url => url.startsWith("https://api.github.com/repos/owner/repo/issues?")));
  assert.ok(urls.every(url => new URL(url).searchParams.get("state") === "all"));
});

test("GitHub failures are explicit, not an empty success-shaped leaderboard", async () => {
  await assert.rejects(() => fetchApproved("owner/repo", null, async () => ({ ok: false, status: 403 })), /403/);
  await assert.rejects(() => fetchApproved("owner/repo", null, async () => ({ ok: true, json: async () => ({}) })), /Unexpected/);
  await assert.rejects(() => fetchApproved("https://evil.test/repo", null), /Invalid community/);
});

test("timing history uses full-data statistics and preserves optional hardware/date without private metadata", () => {
  const f = fixture();
  Object.assign(f.metadata, { started_unix_s: 1795465810, system_ram_mb: 32000, cpu_logical_cores: 8 });
  Object.assign(f.metadata.gpu, { total_memory_bytes: 8 * 1073741824, cuda_driver_version: 13050 });
  const r = importReport(f.metadata, f.csv());
  assert.deepEqual(r.history.stats, { min_ms: 2000, median_ms: 2500, p95_ms: 3000, max_ms: 3000 });
  assert.equal(r.history.frames.length, 2);
  assert.equal(r.history.frames[0].gpu_ms, 1000);
  assert.equal(r.hardware.ram_mb, 32000);
  assert.equal(r.recorded_unix_s, 1795465810);
  assert.doesNotMatch(JSON.stringify(r), /home|private|startup_argv|image_file/);
  const { history, hardware, recorded_unix_s, ...old } = r;
  assert.deepEqual(validateSubmission(old), old);
});

function telemetryFixture() {
  const f = fixture();
  f.metadata.telemetry_status = "complete_partial_sensors"; f.metadata.elapsed_s = 5;
  const header = "elapsed_s,source_frame,gpu_temperature_c,gpu_power_w,gpu_utilization_pct,gpu_memory_used_bytes,gpu_sm_clock_mhz,gpu_memory_clock_mhz,sensor_errors\n";
  return { ...f, telemetry: header + '1,1,65,80,95,1073741824,1500,6500,"private error path"\n2,2,,82,100,2147483648,1510,6500,"/home/private"\n' };
}

test("optional telemetry converts bytes to MiB and retains missing sensors as null", () => {
  const f = telemetryFixture(), r = importReport(f.metadata, f.csv(), "test", f.telemetry);
  assert.equal(r.history.telemetry_samples, 2);
  assert.equal(r.history.telemetry[0].memory_mib, 1024);
  assert.equal(r.history.telemetry[1].temperature_c, null);
  assert.equal(r.history.telemetry[1].utilization_pct, 100);
  assert.doesNotMatch(submissionMarkdown(r), /private error|home\/private|sensor_errors/);
  const entries = collectSubmissions([{ number: 42, user: { login: "tester" },
    labels: [{ name: "benchmark-approved" }], body: submissionMarkdown(r) }], "owner/repo");
  assert.deepEqual(entries[0].report.history, r.history);
  assert.equal(reportId(entries[0]), "owner/repo/42");
  assert.throws(() => reportId({ issue: "https://evil.test/issues/42" }));
});

test("large chart inputs are bounded, cover every frame and keep GitHub issue bodies below 64k", () => {
  const f = telemetryFixture(), count = 2148;
  f.metadata.completed_rows = count; f.metadata.frame_wall_total_ms = count * 2500;
  f.metadata.gpu_total_ms = count * 1250; f.metadata.elapsed_s = count * 2.5;
  const first = f.rows[0];
  const rows = Array.from({ length: count }, (_, i) => ({ ...first, frame: i + 1,
    source_frame: i + 1, source_time_s: (i / 30).toFixed(6), frame_wall_ms: 2500, gpu_ms: 1250 }));
  const headers = Object.keys(first);
  const csv = headers.join(",") + "\n" + rows.map(row => headers.map(key => row[key]).join(",")).join("\n");
  const header = f.telemetry.split("\n")[0];
  const telemetry = header + "\n" + Array.from({ length: 3000 }, (_, i) =>
    `${(i + 1) * 1.25},${Math.min(count, i + 1)},65,80,95,1073741824,1500,6500,`).join("\n");
  const r = importReport(f.metadata, csv, "test", telemetry);
  assert.equal(r.history.frames.length, 120); assert.equal(r.history.telemetry.length, 120);
  assert.equal(r.history.frames[0].first, 1); assert.equal(r.history.frames.at(-1).last, count);
  assert.equal(r.history.telemetry_samples, 3000);
  assert.ok(submissionMarkdown(r).length <= 64000);
  assert.deepEqual(validateSubmission(r), r);
});

for (const change of [
  r => { r.history.frames[0].first = 2; }, r => { r.history.frames.pop(); },
  r => { r.history.frames[0].wall_ms += 999; }, r => { r.history.frames[0].gpu_ms = 0; },
  r => { r.history.stats.min_ms = 10000; }, r => { r.history.telemetry[0].utilization_pct = 101; },
  r => { r.history.telemetry[1].elapsed_s = 0; }, r => { r.history.telemetry_samples = 0; },
  r => { r.history.telemetry = Array(121).fill(r.history.telemetry[0]); }
]) test("rejects malformed or contradictory published chart data", () => {
  const f = telemetryFixture(), r = importReport(f.metadata, f.csv(), "test", f.telemetry);
  change(r); assert.throws(() => validateSubmission(r));
});

test("rejects wrong telemetry files and unavailable GL GPU timings explicitly", () => {
  const f = telemetryFixture();
  assert.throws(() => importReport(f.metadata, f.csv(), "", f.telemetry.replace("2,2,", "0.5,2,")), /increasing/);
  assert.throws(() => importReport(f.metadata, f.csv(), "", f.telemetry.replace("2,2,", "2,3,")), /source frame/);
  f.metadata.telemetry_status = "unavailable";
  assert.throws(() => importReport(f.metadata, f.csv(), "", f.telemetry), /completed telemetry/);
  const gl = fixture(true), r = importReport(gl.metadata, gl.csv());
  assert.ok(r.history.frames.every(row => row.gpu_ms === null));
  r.history.frames[0].gpu_ms = 0;
  assert.throws(() => validateSubmission(r), /GL chart/);
});

test("publishing separates on-demand reports from the index and removes only stale generated files", async () => {
  const directory = await mkdtemp(join(tmpdir(), "doom3-site-report-test-"));
  const base = pathToFileURL(directory + "/");
  try {
    await writeFile(new URL("issue_99.json", base), "{}");
    await writeFile(new URL("keep.txt", base), "not generated");
    const f = telemetryFixture(), report = importReport(f.metadata, f.csv(), "test", f.telemetry);
    const entries = [{ issue: "https://github.com/owner/repo/issues/42", author: "tester", preview: null, report }];
    const index = await writeReportFiles(entries, base);
    assert.equal(index[0].report.history, undefined);
    assert.equal(index[0].details, "reports/issue_42.json");
    assert.deepEqual(JSON.parse(await readFile(new URL("issue_42.json", base), "utf8")), report);
    assert.deepEqual((await readdir(base)).sort(), ["issue_42.json", "keep.txt"]);
    await writeReportFiles([], base);
    assert.deepEqual(await readdir(base), ["keep.txt"]);
  } finally { await rm(directory, { recursive: true }); }
});
