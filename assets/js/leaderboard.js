import { validateSubmission, isRankable, compatibilityKey, capturedFps, safePreviewUrl, reportId } from "./reports.js";
import { reportProfile } from "./benchmark-config.js";
import { reportCharts } from "./charts.js";
import { element, downloadText } from "./ui.js";

const MODEL_NAMES = { PT_PHYSICAL: "Physical PT", legacy: "Legacy PT", OpenGL: "OpenGL" };
const BACKEND_NAMES = { cuda: "CUDA", opencl: "OpenCL", opengl: "OpenGL" };
const pacingName = report => report.pacing === "uncapped" ? "uncapped" : "capped 30 Hz";
// what the captured FPS includes, which depends on how the run was made
const fpsNote = report => report.pacing === "uncapped" && !report.save_images
  ? "Uncapped run without image writes: captured FPS is rendering throughput (plus CPU work), but every frame converges fully, so it is not gameplay FPS."
  : `Captured FPS includes ${report.pacing === "uncapped" ? "" : "30 Hz playback pacing and "}${report.save_images ? "image writes" : "CPU work"}, not just rendering. It is not gameplay FPS.`;
const LOCAL_REPORT = "doom3-pt-local-report";
const format = (value, digits = 3) => value === null || value === undefined ? "unavailable" :
  value.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const gpuTime = report => report.gpu_ms === null ? Infinity : report.gpu_ms / report.frames;
const date = report => report.recorded_unix_s ? new Date(report.recorded_unix_s * 1000).toISOString().slice(0, 10) : "not reported";

function localReport() {
  const saved = sessionStorage.getItem(LOCAL_REPORT);
  if (!saved) throw new Error("No local report is prepared in this tab. Check your files on Run & submit first.");
  return validateSubmission(JSON.parse(saved));
}

async function loadEntries(source, local = false) {
  if (local) return [{ id: "local-preview", author: "local-preview", report: localReport() }];
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Leaderboard request failed (${response.status}).`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("Invalid leaderboard data.");
  const ids = new Set();
  return data.map(entry => {
    const id = reportId(entry);
    if (ids.has(id)) throw new Error("Duplicate report ID.");
    ids.add(id);
    if (typeof entry.author !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(entry.author)) throw new Error("Invalid report author.");
    if (entry.details !== undefined && entry.details !== `reports/issue_${id.split("/").at(-1)}.json`) {
      throw new Error("Invalid report detail path.");
    }
    return { ...entry, report: validateSubmission(entry.report), id };
  });
}

function description(report) {
  return `${reportProfile(report)} / ${MODEL_NAMES[report.model]} / ${BACKEND_NAMES[report.backend]} / ${report.width}x${report.height} / ` +
    `${report.spp} spp / ${pacingName(report)}${report.save_images ? " + images" : ""} / ${report.revision}`;
}

function summary(values) {
  const list = element("dl", undefined, "summary");
  for (const [key, value] of Object.entries(values)) list.append(element("dt", key), element("dd", String(value)));
  return list;
}

function configuration(report) {
  const details = element("details");
  details.append(element("summary", "Exact benchmark configuration"), element("pre", JSON.stringify({
    source: report.source, fingerprint: report.fingerprint, revision: report.revision, frames: report.frames,
    width: report.width, height: report.height, spp: report.spp, batch: report.batch,
    dispatches_per_frame: report.dispatches_per_frame, backend: report.backend, pacing: report.pacing,
    save_images: report.save_images, settings: report.settings,
    omitted_settings: report.omitted_settings
  }, null, 2)));
  return details;
}

const board = document.querySelector("#leaderboard");
if (board) {
  const local = new URLSearchParams(location.search).get("local") === "1";
  const status = board.querySelector("#leaderboard-status"), results = board.querySelector("#leaderboard-results");
  const groupSelect = board.querySelector("#leaderboard-group"), model = board.querySelector("#leaderboard-model");
  const platform = board.querySelector("#leaderboard-platform"), search = board.querySelector("#leaderboard-search");
  const sort = board.querySelector("#leaderboard-sort"), previous = board.querySelector("#leaderboard-prev");
  const next = board.querySelector("#leaderboard-next");
  let entries = [], groups = [], page = 1;
  const pageSize = 25;
  function groupOptions() {
    const grouped = new Map();
    for (const entry of entries.filter(entry => !model.value || entry.report.model === model.value)) {
      const key = isRankable(entry.report) ? compatibilityKey(entry.report) : `development:${entry.id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(entry);
    }
    groups = [...grouped.values()];
    const all = element("option", local ? "Local preview (not published)" : "All workloads (browse only, no combined ranking)"); all.value = "";
    groupSelect.replaceChildren(all);
    groups.forEach((group, i) => {
      const option = element("option", `${isRankable(group[0].report) ? "" : "Unranked / "}${description(group[0].report)} / settings ${i + 1} (${group.length})`);
      option.value = String(i); groupSelect.append(option);
    });
  }
  function render() {
    results.replaceChildren();
    const group = groupSelect.value === "" ? null : groups[Number(groupSelect.value)];
    const candidates = group || entries.filter(entry => !model.value || entry.report.model === model.value);
    const byFps = [...candidates].sort((a, b) => capturedFps(b.report) - capturedFps(a.report));
    const ranks = new Map();
    let rank = 0, lastFps = null;
    byFps.forEach((entry, i) => {
      const fps = capturedFps(entry.report);
      if (fps !== lastFps) rank = i + 1;
      lastFps = fps; ranks.set(entry.id, rank);
    });
    const query = search.value.trim().toLowerCase();
    const filtered = candidates.filter(entry => (!platform.value || entry.report.platform === platform.value) &&
      `${entry.report.gpu} ${entry.report.cpu} ${entry.author}`.toLowerCase().includes(query));
    filtered.sort((a, b) => {
      if (sort.value === "date") return (b.report.recorded_unix_s || 0) - (a.report.recorded_unix_s || 0) || a.id.localeCompare(b.id);
      if (sort.value === "gpu") return gpuTime(a.report) - gpuTime(b.report) || a.id.localeCompare(b.id);
      return capturedFps(b.report) - capturedFps(a.report) || a.id.localeCompare(b.id);
    });
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); page = Math.min(page, pages);
    previous.disabled = page === 1; next.disabled = page === pages;
    board.querySelector("#leaderboard-page").textContent = `Page ${page} / ${pages}`;
    status.textContent = local ? "Local preview only. Nothing uploaded, reviewed or ranked." :
      `${filtered.length} of ${entries.length} reviewed reports. ` +
      (group && isRankable(group[0].report) ? "Ranks use captured FPS within this exact workload, before search/platform filtering." :
        "Browse only: select a clean, matching workload to compare ranks. Different workloads are not comparable.");
    if (!filtered.length) { results.append(element("p", entries.length ? "No reports match these filters." : "No results yet. Be the first to submit a report.")); return; }
    const table = element("table"), caption = element("caption", local ? "Your local benchmark / unpublished preview" :
      group ? description(group[0].report) : "All workloads / unranked browsing");
    table.append(caption);
    const head = element("thead"), header = element("tr");
    for (const title of ["Rank", "GPU / CPU", "Workload", "Captured FPS", "GPU ms/frame", "Platform / driver", "Recorded / user", "Report"]) {
      const th = element("th", title); th.scope = "col"; header.append(th);
    }
    head.append(header); table.append(head);
    const body = element("tbody"), ranked = Boolean(!local && group && isRankable(group[0].report));
    const topFps = byFps.length ? capturedFps(byFps[0].report) : 1;
    for (const entry of filtered.slice((page - 1) * pageSize, page * pageSize)) {
      const r = entry.report, row = element("tr");
      row.append(element("td", local ? "unranked preview" : ranked ? `#${ranks.get(entry.id)}` : isRankable(r) ? "browse only" : "unranked"));
      const hardware = element("td"); hardware.append(element("strong", r.gpu), element("small", r.cpu));
      const workload = element("td"); workload.append(element("strong", MODEL_NAMES[r.model]),
        element("small", `${r.width}x${r.height} / ${r.spp} spp`), element("small", reportProfile(r)));
      const fps = element("td", format(capturedFps(r)), "numeric");
      if (ranked) { const bar = element("span", undefined, "score-bar"); bar.style.width = `${100 * capturedFps(r) / topFps}%`; fps.append(bar); }
      const environment = element("td"); environment.append(element("span", r.platform), element("small", r.driver));
      const submitted = element("td"); submitted.append(element("span", date(r)), element("small", local ? "not submitted" : `@${entry.author}`));
      const detail = element("td"), link = element("a", "View report");
      link.href = local ? `${board.dataset.reportUrl}?local=1` : `${board.dataset.reportUrl}?id=${encodeURIComponent(entry.id)}`; detail.append(link);
      row.append(hardware, workload, fps, element("td", r.gpu_ms === null ? "unavailable" : format(gpuTime(r))), environment, submitted, detail);
      body.append(row);
    }
    table.append(body);
    const wrap = element("div", undefined, "table-wrap"); wrap.tabIndex = 0; wrap.setAttribute("aria-label", "Benchmark results, scroll horizontally for details");
    wrap.append(table); results.append(wrap);
    if (group) results.append(configuration(group[0].report));
  }
  for (const control of [groupSelect, platform, search, sort]) control.addEventListener(control === search ? "input" : "change", () => { page = 1; render(); });
  model.addEventListener("change", () => { page = 1; groupOptions(); render(); });
  previous.addEventListener("click", () => { page--; render(); });
  next.addEventListener("click", () => { page++; render(); });
  loadEntries(board.dataset.source, local).then(data => {
    entries = data; groupOptions();
    for (const value of [...new Set(entries.map(entry => entry.report.platform))].sort()) {
      const option = element("option", value); option.value = value; platform.append(option);
    }
    for (const control of [groupSelect, model, platform, search, sort]) control.disabled = false;
    render();
  }).catch(error => {
    status.textContent = `${local ? "Could not open local preview" : "Could not load reviewed results"}: ${error.message}`;
    groupSelect.replaceChildren(element("option", "Leaderboard unavailable"));
  });
}

const detail = document.querySelector("#benchmark-report");
if (detail) {
  const status = detail.querySelector("#detail-status"), content = detail.querySelector("#detail-content");
  async function load() {
    try {
      const params = new URLSearchParams(location.search);
      let entry = null, report, workloadRank = null, local = params.get("local") === "1";
      if (local) {
        report = localReport();
      } else {
        const id = params.get("id");
        if (!id) throw new Error("Choose View report on the leaderboard, or preview a checked local submission.");
        const published = await loadEntries(detail.dataset.source);
        entry = published.find(item => item.id === id);
        if (!entry) throw new Error("Report not found. It may not be approved or may have been removed.");
        report = entry.report;
        if (isRankable(report)) {
          const peers = published.filter(item => isRankable(item.report) && compatibilityKey(item.report) === compatibilityKey(report));
          workloadRank = `#${1 + peers.filter(item => capturedFps(item.report) > capturedFps(report)).length} of ${peers.length} in this exact workload`;
        }
        if (entry.details) {
          const response = await fetch(new URL(entry.details, new URL(detail.dataset.source, location.href)));
          if (!response.ok) throw new Error(`Report data request failed (${response.status}).`);
          report = validateSubmission(await response.json());
          const { history, ...indexReport } = report;
          if (JSON.stringify(indexReport) !== JSON.stringify(entry.report)) throw new Error("Report details disagree with the leaderboard index.");
        }
      }
      const r = report, hardware = r.hardware || {};
      status.textContent = local ? "Local preview. Nothing uploaded; this URL is not a public report." : `Community-reviewed submission by @${entry.author}. Not independently verified.`;
      if (workloadRank) content.append(element("p", workloadRank, "eyebrow"));
      content.append(element("h2", r.gpu), element("p", description(r), "caption"));
      const metrics = element("div", undefined, "metric-cards");
      for (const [label, value] of [
        ["Captured FPS", format(capturedFps(r))], ["GPU ms / frame", r.gpu_ms === null ? "unavailable" : format(gpuTime(r))],
        ["Capture time", `${format(r.wall_ms / 1000, 1)} s`],
        ["P95 frame time", r.history ? `${format(r.history.stats.p95_ms)} ms` : "not reported"]
      ]) { const card = element("section"); card.append(element("span", label), element("strong", value)); metrics.append(card); }
      content.append(metrics, element("p", `${fpsNote(r)} PT GPU time measures instrumented GPU stages; GL GPU timing is unavailable.`, "caption"));
      const actions = element("div", undefined, "actions"), download = element("button", "Download summary");
      download.type = "button"; download.addEventListener("click", () => downloadText("benchmark-submission.json", JSON.stringify(r, null, 2) + "\n", "application/json"));
      actions.append(download);
      if (entry) {
        const source = element("a", "Source issue & full report ZIP", "button secondary"); source.href = entry.issue; actions.append(source);
        const permalink = element("button", "Copy report link", "secondary");
        permalink.addEventListener("click", async () => {
          try { await navigator.clipboard.writeText(location.href); status.textContent = "Report link copied."; }
          catch { status.textContent = "Clipboard unavailable. Copy this page's address from your browser."; }
        });
        actions.append(permalink);
      }
      const back = element("a", local ? "Preview leaderboard row" : "Leaderboard", "button secondary");
      back.href = detail.dataset.leaderboardUrl + (local ? "?local=1" : ""); actions.append(back);
      content.append(actions);
      if (!isRankable(r)) content.append(element("p", "Feedback only: dirty/unknown sources or incomplete settings. This run is not ranked.", "notice"));
      content.append(summary({
        Renderer: MODEL_NAMES[r.model], Backend: BACKEND_NAMES[r.backend], Profile: reportProfile(r),
        Pacing: pacingName(r), "Images saved": r.save_images ? "yes" : "no", Revision: r.revision, Demo: r.source,
        "Demo fingerprint": r.fingerprint, Frames: r.frames, Resolution: `${r.width}x${r.height}`,
        "SPP / batch / dispatches": `${r.spp} / ${r.batch} / ${r.dispatches_per_frame}`,
        CPU: r.cpu, "Logical CPU cores": hardware.logical_cores ?? "not reported",
        "System RAM": hardware.ram_mb === undefined ? "not reported" : `${format(hardware.ram_mb / 1024, 2)} GiB`,
        "GPU memory": hardware.vram_bytes === undefined ? "not reported" : `${format(hardware.vram_bytes / 1073741824, 2)} GiB`,
        Platform: r.platform, "GPU driver": r.driver,
        "CUDA driver API": hardware.cuda_driver ?? "not reported", "CUDA runtime": hardware.cuda_runtime ?? "not reported",
        "Recorded (UTC)": date(r)
      }));
      if (r.history) content.append(summary({
        "Minimum frame ms": format(r.history.stats.min_ms), "Mean frame ms": format(r.wall_ms / r.frames),
        "Median frame ms": format(r.history.stats.median_ms), "P95 frame ms (nearest rank)": format(r.history.stats.p95_ms),
        "Maximum frame ms": format(r.history.stats.max_ms)
      }));
      const preview = safePreviewUrl(entry?.preview);
      if (preview) {
        const image = element("img", undefined, "report-preview"); image.src = preview; image.alt = `Submitted ${MODEL_NAMES[r.model]} benchmark preview`;
        image.loading = "lazy"; image.referrerPolicy = "no-referrer"; content.append(image);
      }
      content.append(reportCharts(r), configuration(r)); content.hidden = false;
      document.title = `${r.gpu} / ${MODEL_NAMES[r.model]} benchmark / Doom 3 PT`;
    } catch (error) {
      content.replaceChildren(); content.hidden = true;
      status.textContent = `Could not open report: ${error.message}`;
      const back = element("a", "Back to leaderboard"); back.href = detail.dataset.leaderboardUrl; status.append(" ", back);
    }
  }
  load();
}
