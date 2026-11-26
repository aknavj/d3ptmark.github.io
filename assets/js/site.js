import { importReport, submissionMarkdown, isRankable, capturedFps } from "./reports.js";
import { reportProfile } from "./benchmark-config.js";
import { element, downloadText } from "./ui.js";
import "./configurator.js";
import "./leaderboard.js";
import "./video-intro.js";

for (const figure of document.querySelectorAll("[data-comparison]")) {
  const control = figure.querySelector(".comparison-control");
  const slider = control.querySelector("input");
  figure.classList.add("interactive");
  control.hidden = false;
  const update = () => figure.style.setProperty("--reveal", `${slider.value}%`);
  slider.addEventListener("input", update);
  update();
}

const form = document.querySelector("#report-form");
if (form) {
  let current = null, previewUrl = null, editVersion = 0;
  const status = document.querySelector("#report-status");
  const result = document.querySelector("#submission-result");
  const consent = document.querySelector("#publish-consent");
  const openButton = document.querySelector("#open-submission");
  const markdown = document.querySelector("#submission-markdown");
  const preview = document.querySelector("#local-preview");
  const clear = () => {
    editVersion++;
    current = null; result.hidden = true; consent.checked = false; openButton.disabled = true;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; preview.hidden = true; preview.removeAttribute("src");
    status.textContent = "";
  };
  form.addEventListener("change", event => { if (event.target !== consent) clear(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    clear();
    const version = editVersion;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      const meta = document.querySelector("#metadata-file").files[0];
      const csv = document.querySelector("#frames-file").files[0];
      const telemetry = document.querySelector("#telemetry-file").files[0];
      if (!meta || !csv) throw new Error("Choose metadata.json and frames.csv.");
      if (meta.size > 2 * 1024 * 1024 || csv.size > 32 * 1024 * 1024 ||
          (telemetry && telemetry.size > 32 * 1024 * 1024)) throw new Error("The selected report exceeds the file-size limits.");
      const [metaText, csvText, telemetryText] = await Promise.all([meta.text(), csv.text(), telemetry ? telemetry.text() : null]);
      if (version !== editVersion) return;
      const report = importReport(JSON.parse(metaText), csvText, document.querySelector("#driver-version").value, telemetryText);
      const image = document.querySelector("#preview-file").files[0];
      if (image) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) {
          throw new Error("Choose a PNG/JPEG/WebP preview up to 5 MB.");
        }
        previewUrl = URL.createObjectURL(image);
        preview.src = previewUrl;
        await preview.decode();
        if (version !== editVersion) return;
        preview.hidden = false;
      }
      current = report;
      const summary = document.querySelector("#report-summary");
      summary.replaceChildren();
      const values = {
        GPU: report.gpu, Renderer: report.model, Profile: reportProfile(report), Revision: report.revision,
        Workload: `${report.source}, ${report.width}x${report.height}, ${report.spp} spp`,
        Frames: report.frames.toLocaleString(),
        "Captured fps (not gameplay)": capturedFps(report).toFixed(3),
        "GPU ms/frame": report.gpu_ms === null ? "unavailable (OpenGL)" : (report.gpu_ms / report.frames).toFixed(3)
      };
      for (const [key, value] of Object.entries(values)) summary.append(element("dt", key), element("dd", value));
      markdown.value = submissionMarkdown(report);
      document.querySelector("#ranking-warning").textContent = isRankable(report)
        ? "Ready for maintainer review. Include the report ZIP, settings history and preview."
        : "Feedback only, not ranked: source revision or settings could not be fully identified.";
      result.hidden = false;
      status.textContent = "Report checked. Nothing uploaded.";
    } catch (error) {
      if (version !== editVersion) return;
      clear();
      status.textContent = `Could not prepare submission: ${error.message}`;
    } finally { button.disabled = false; }
  });
  consent.addEventListener("change", () => { openButton.disabled = !current || !consent.checked; });
  document.querySelector("#copy-submission").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(markdown.value);
      status.textContent = "Copied. Paste into GitHub, then attach your reviewed ZIP and preview.";
    } catch {
      markdown.focus(); markdown.select();
      status.textContent = "Clipboard unavailable. Copy the selected text manually.";
    }
  });
  document.querySelector("#download-submission").addEventListener("click", () => {
    if (!current) return;
    downloadText("benchmark-submission.json", JSON.stringify(current, null, 2) + "\n", "application/json");
    status.textContent = "Summary downloaded. Review your original ZIP separately.";
  });
  document.querySelector("#preview-report").addEventListener("click", event => {
    event.preventDefault();
    if (!current) return;
    try {
      sessionStorage.setItem("doom3-pt-local-report", JSON.stringify(current));
      location.assign(`${event.currentTarget.href}?local=1`);
    } catch (error) {
      status.textContent = `Local preview unavailable: ${error.message}. You can still download the summary.`;
    }
  });
  openButton.addEventListener("click", () => {
    if (!current || !consent.checked) return;
    const repository = form.dataset.repository;
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) {
      status.textContent = "The site's submission repository is misconfigured.";
      return;
    }
    const url = new URL(`https://github.com/${repository}/issues/new`);
    url.searchParams.set("title", `Benchmark: ${current.gpu} / ${current.model}`);
    url.searchParams.set("body", "Paste your prepared submission here. Attach your reviewed report ZIP and preview.");
    window.open(url.href, "_blank", "noopener,noreferrer");
    status.textContent = "Paste the text into GitHub and add your attachments. Nothing submitted yet.";
  });
  window.addEventListener("pagehide", () => { if (previewUrl) URL.revokeObjectURL(previewUrl); });
}
