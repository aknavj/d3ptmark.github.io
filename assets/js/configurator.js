import { QUALITY_PRESETS, BINARIES, defaultConfig, defaultExecutable as executableFor, generateBenchmark } from "./benchmark-config.js";
import { downloadText } from "./ui.js";

const builder = document.querySelector("#benchmark-builder");
if (builder) {
  const states = { physical: defaultConfig("physical"), legacy: defaultConfig("legacy") };
  let model = "physical", output = null;
  const fields = [...builder.querySelectorAll("[data-setting]")];
  const config = builder.querySelector("#generated-config");
  const command = builder.querySelector("#launch-command");
  const status = builder.querySelector("#builder-status");
  const error = builder.querySelector("#builder-error");
  const executable = builder.querySelector("#engine-path");
  const platform = builder.querySelector("#command-platform");
  const executablePaths = new Map();
  let activePlatform = platform.value;
  const actionButtons = [...builder.querySelectorAll("[data-output-action]")];
  const headless = builder.querySelector("#headless");
  function defaultExecutable() {
    return executableFor(model, platform.value);
  }
  function populate() {
    for (const field of fields) {
      if (field.type === "checkbox") field.checked = states[model][field.dataset.setting];
      else field.value = states[model][field.dataset.setting];
    }
    for (const part of builder.querySelectorAll("[data-model-only]")) part.hidden = part.dataset.modelOnly !== model;
    for (const tab of builder.querySelectorAll('[role="tab"]')) {
      const active = tab.dataset.model === model;
      tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1;
    }
    builder.querySelector("#benchmark-options").setAttribute("aria-labelledby", `tab-${model}`);
    builder.querySelector("#required-build").textContent = `Runs ${BINARIES[model]} (${model === "physical" ? "physical" : "legacy"} path tracer). Both binaries come from one build.`;
    builder.querySelector("#build-link").href = `${builder.dataset.installUrl}#2-build`;
  }
  function render() {
    output = null;
    error.textContent = ""; status.textContent = "";
    try {
      const next = { ...states[model] };
      for (const field of fields) next[field.dataset.setting] = field.type === "checkbox" ? field.checked : field.value;
      output = generateBenchmark(next, { platform: platform.value, executable: executable.value,
        dataPath: builder.querySelector("#game-data-path").value, headless: headless.checked });
      config.value = output.config; command.value = output.command;
      builder.querySelector("#profile-name").textContent = output.profile === "custom" ? "Custom" : `Site standard / ${output.profile}`;
      const samples = Number(next.spp);
      builder.querySelector("#builder-summary").textContent = `${output.width}x${output.height} traced pixels / ${samples} spp / ${samples / output.batch} dispatches per frame`;
      builder.querySelector("#budget-warning").textContent = samples >= 32 || Number(next.width) * Number(next.height) >= 3840 * 2160 ||
        next.fog || (model === "physical" && next.dof)
        ? "Heavy capture: high sample counts, resolution, fog or DOF can take hours. No runtime estimate is available."
        : next.uncapped && !next.saveImages
          ? "Uncapped, no image writes: captured FPS measures rendering throughput of fully converged frames, not gameplay FPS."
          : `Capture FPS includes ${next.uncapped ? "" : "30 Hz pacing and "}${next.saveImages ? "image writes" : "CPU work"}, not just GPU rendering.`;
    } catch (e) {
      config.value = ""; command.value = ""; error.textContent = e.message;
      builder.querySelector("#profile-name").textContent = "Check settings";
      builder.querySelector("#builder-summary").textContent = "";
    }
    for (const button of actionButtons) button.disabled = !output;
  }
  function save() {
    for (const field of fields) states[model][field.dataset.setting] = field.type === "checkbox" ? field.checked : field.value;
  }
  for (const tab of builder.querySelectorAll('[role="tab"]')) {
    tab.addEventListener("click", () => {
      executablePaths.set(`${model}:${activePlatform}`, executable.value);
      save(); model = tab.dataset.model; populate();
      executable.value = executablePaths.get(`${model}:${activePlatform}`) ?? defaultExecutable(); render();
    });
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const tabs = [...builder.querySelectorAll('[role="tab"]')];
      const target = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[1] : tabs.find(item => item !== tab);
      target.click(); target.focus();
    });
  }
  builder.addEventListener("input", event => {
    if (["scale", "batch", "depth", "lights"].includes(event.target.dataset.setting)) {
      builder.querySelector('[data-setting="preset"]').value = "custom";
    }
    render();
  });
  builder.querySelector('[data-setting="preset"]').addEventListener("change", event => {
    const preset = QUALITY_PRESETS[event.target.value];
    if (preset) for (const [i, key] of ["scale", "batch", "depth", "lights"].entries()) {
      builder.querySelector(`[data-setting="${key}"]`).value = preset[i];
    }
    render();
  });
  platform.addEventListener("change", () => {
    executablePaths.set(`${model}:${activePlatform}`, executable.value); activePlatform = platform.value;
    executable.value = executablePaths.get(`${model}:${activePlatform}`) ?? defaultExecutable(); render();
  });
  builder.querySelector("#reset-profile").addEventListener("click", () => {
    states[model] = defaultConfig(model); populate(); render();
  });
  builder.querySelector("#download-config").addEventListener("click", () => {
    if (output) { downloadText(output.filename, output.config); status.textContent = `Downloaded ${output.filename}. Copy it to your game's base/ folder.`; }
  });
  for (const [id, textarea] of [["copy-config", config], ["copy-command", command]]) {
    builder.querySelector(`#${id}`).addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(textarea.value); status.textContent = "Copied."; }
      catch { textarea.focus(); textarea.select(); status.textContent = "Clipboard unavailable. Copy the selected text manually."; }
    });
  }
  populate(); executable.value = defaultExecutable(); render();
}
