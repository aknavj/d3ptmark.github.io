export const BACKENDS = Object.freeze(["cuda", "opencl"]);
export const BINARIES = Object.freeze({ physical: "d3ptmark-pt", legacy: "d3ptmark-le" });

export const QUALITY_PRESETS = Object.freeze({
  gameplay_low: [0.35, 1, 1, 1], gameplay_med: [0.5, 1, 2, 1],
  gameplay_high: [0.67, 1, 2, 2], gameplay_ultra: [0.75, 2, 3, 2],
  cinematic_low: [1, 4, 3, 2], cinematic_med: [1, 8, 4, 4],
  cinematic_high: [1, 16, 6, 6], cinematic_ultra: [1, 32, 8, 8]
});

const COMMON = Object.freeze({
  r_ptDraw: 1, r_ptMode: 0,
  r_ptIndirectProb: 0.15, r_ptRussianRoulette: 1, r_ptRRMinBounces: 2,
  r_ptRRSurvivalMin: 0.1, r_ptEarlyTermThreshold: 0.05, r_ptFireflyClamp: 5,
  r_ptThroughputClamp: 0.25, r_ptAccumulation: 1, r_ptResetOnSceneChange: 1,
  r_ptRayOffset: 0.001, r_ptEmissionBoost: 1, r_ptSpecularBoost: 2, r_ptSoftShadowScale: 0.2,
  r_ptDenoiseStrength: 0.5, r_ptDenoiseDebug: 0, r_ptDenoiseDebugSignal: 0,
  r_ptExposure: 1, r_ptGamma: 2.2, r_ptToneMapMode: 1,
  r_ptBloom: 0, r_ptBloomThreshold: 1, r_ptBloomRadius: 0.025, r_ptLensFlare: 0,
  r_ptSkyColorZenithR: 0.45, r_ptSkyColorZenithG: 0.28, r_ptSkyColorZenithB: 0.18,
  r_ptSkyColorHorizonR: 0.65, r_ptSkyColorHorizonG: 0.45, r_ptSkyColorHorizonB: 0.30,
  r_ptSkyColorGroundR: 0.12, r_ptSkyColorGroundG: 0.06, r_ptSkyColorGroundB: 0.03,
  r_ptVolumetric: 0, r_ptVolumetricDensity: 0.008, r_ptVolumetricSteps: 16,
  r_ptVolumetricAnisotropy: 0.6, r_ptVolFalloff: 2, r_ptVolMaxDist: 500,
  r_ptCaptureReport: 1, r_ptCaptureTelemetry: 1,
  r_screenshotFormat: 2, r_swapInterval: 0, r_lightScale: 2, com_fixedTic: 0, g_stopTime: 0
});
const PHYSICAL = Object.freeze({
  r_ptPhysicalAutoMaterials: 1, r_ptPhysicalMetersPerUnit: 0.0254,
  r_ptPhysicalLightLumens: 1500, r_ptPhysicalSunLux: 50000, r_ptPhysicalEmissionNits: 100,
  r_ptPhysicalIor: 1.5, r_ptPhysicalRoughnessScale: 1,
  r_ptPhysicalISO: 800, r_ptPhysicalShutter: 0.03333333, r_ptPhysicalFNumber: 2.8,
  r_ptPhysicalSensorWidth: 36, r_ptPhysicalFogAlbedo: 0.9,
  r_ptPhysicalFogAnisotropy: 0.3, r_ptPhysicalFogRadius: 30, r_ptPhysicalFogSteps: 16
});

export function defaultConfig(model = "physical") {
  if (!["physical", "legacy"].includes(model)) throw new Error("Choose Physical PT or Legacy PT.");
  return {
    model, backend: "cuda", demo: "demo1", width: 1280, height: 1024, spp: 8, preset: "cinematic_low",
    scale: 1, batch: 4, depth: 3, lights: 2, denoise: true, fog: false,
    dof: false, exposure: 0, focalLength: 35, focusDistance: 3, legacyExposure: 1,
    uncapped: true, saveImages: false
  };
}

// the standard profile accepts either backend; reports are still grouped per backend
const PROFILE_FREE = new Set(["backend"]);

function bounded(value, label, min, max, integer = false) {
  if ((typeof value === "string" && value.trim() === "") || value === null || !["number", "string"].includes(typeof value) ||
      !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max ||
      (integer && !Number.isInteger(Number(value)))) throw new Error(`${label}: use ${min} to ${max}${integer ? " (whole numbers)" : ""}.`);
  return Number(value);
}

export function validateConfig(input) {
  const c = { ...defaultConfig(input.model), ...input, model: input.model ?? "physical" };
  if (typeof c.demo !== "string" || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(c.demo) || c.demo.length > 100) {
    throw new Error("Use a demo name without its demos/ prefix or .demo extension.");
  }
  for (const [key, label, min, max, integer] of [
    ["width", "Width", 320, 7680, true], ["height", "Height", 240, 4320, true],
    ["spp", "Samples", 1, 100000, true], ["scale", "Render scale", 0.1, 1, false],
    ["batch", "Samples per dispatch", 1, 64, true], ["depth", "Bounces", 1, 16, true],
    ["lights", "Light samples", 1, 8, true], ["exposure", "Exposure EV", -10, 10, false],
    ["focalLength", "Focal length", 10, 200, false], ["focusDistance", "Focus distance", 0.25, 1000, false],
    ["legacyExposure", "Exposure multiplier", 0.01, 100, false]
  ]) c[key] = bounded(c[key], label, min, max, integer);
  for (const key of ["denoise", "fog", "dof", "uncapped", "saveImages"]) if (typeof c[key] !== "boolean") throw new Error(`Invalid ${key} switch.`);
  if (!BACKENDS.includes(c.backend)) throw new Error("Choose the CUDA or OpenCL backend.");
  if (c.preset !== "custom" && !Object.hasOwn(QUALITY_PRESETS, c.preset)) throw new Error("Unknown quality preset.");
  if (c.preset !== "custom" && QUALITY_PRESETS[c.preset].some((value, i) =>
    value !== [c.scale, c.batch, c.depth, c.lights][i])) c.preset = "custom";
  return c;
}

export function configSettings(input) {
  const c = validateConfig(input);
  const values = {
    ...COMMON, r_ptBackend: c.backend, r_ptPreset: c.preset, r_ptRenderScale: c.scale,
    r_ptSamplesPerPixel: c.batch, r_ptMaxDepth: c.depth, r_ptMaxLightSamples: c.lights,
    r_ptDenoise: Number(c.denoise), r_ptSkyIntensity: c.model === "physical" ? 25 : 1
  };
  if (c.model === "physical") Object.assign(values, PHYSICAL, {
    r_ptPhysicalDOF: Number(c.dof), r_ptPhysicalExposureCompensation: c.exposure,
    r_ptPhysicalFocalLength: c.focalLength, r_ptPhysicalFocusDistance: c.focusDistance,
    r_ptPhysicalFogDensity: c.fog ? 0.0183 : 0
  });
  else Object.assign(values, { r_ptExposure: c.legacyExposure, r_ptVolumetric: c.fog ? 1 : 0 });
  return values;
}

export function configProfile(input) {
  const c = validateConfig(input), standard = defaultConfig(c.model);
  return Object.keys(standard).every(key => PROFILE_FREE.has(key) || c[key] === standard[key]) ? `${c.model}-v1` : "custom";
}

export function benchmarkBatch(spp, limit) {
  let batch = Math.min(spp, limit);
  while (spp % batch !== 0) batch--;
  return batch;
}

export function generateBenchmark(input, launch = {}) {
  const c = validateConfig(input), profile = configProfile(c);
  const filename = `ptbench-${c.model}-${profile === "custom" ? "custom" : "v1"}.cfg`;
  const settings = configSettings(c);
  const options = [...(c.uncapped ? ["uncapped"] : []), "save_image", c.saveImages ? "1" : "0"];
  const config = [
    `// Doom 3 PT / ${profile} / ${c.width}x${c.height} viewport / ${c.backend}`,
    `// Run with ${BINARIES[c.model]} (${c.model === "physical" ? "physical" : "legacy"} path tracer). Use the matching launch command.`,
    "// Sets benchmark CVars. Archived settings may be saved by the engine.",
    ...Object.entries(settings).map(([key, value]) => `set ${key} ${value}`),
    `r_ptBenchmark ${c.demo} ${c.spp} ${options.join(" ")}`, ""
  ].join("\n");
  const platform = launch.platform ?? "linux";
  if (!["linux", "windows"].includes(platform)) throw new Error("Choose Linux or Windows PowerShell.");
  const executable = launch.executable ?? defaultExecutable(c.model, platform);
  const dataPath = launch.dataPath ?? "";
  for (const path of [executable, dataPath]) {
    if (typeof path !== "string" || path.length > 500 || /[\u0000-\u001f\u007f]/.test(path)) {
      throw new Error("Paths must be single-line text up to 500 characters.");
    }
    if (dataPath.startsWith("+")) throw new Error("Prefix relative game-data paths beginning with + with ./ (or use an absolute path).");
  }
  if (!executable.trim() || executable.trim().startsWith("-")) throw new Error("Enter the engine executable path.");
  const quote = value => "'" + value.replaceAll("'", platform === "windows" ? "''" : "'\\''") + "'";
  const args = [
    ...(launch.headless ? ["--headless"] : []),
    ...(dataPath ? ["+set", "fs_basepath", dataPath] : []),
    "+set", "r_fullscreen", "0", "+set", "r_mode", "-1",
    "+set", "r_customWidth", String(c.width), "+set", "r_customHeight", String(c.height),
    "+exec", filename
  ];
  const command = `${platform === "windows" ? "& " : ""}${quote(executable)} ${args.map(quote).join(" ")}`;
  const batch = benchmarkBatch(c.spp, c.batch);
  return { config, command, filename, profile, settings, batch,
    width: Math.max(64, Math.floor(c.width * c.scale)), height: Math.max(64, Math.floor(c.height * c.scale)) };
}

export function defaultExecutable(model, platform = "linux") {
  return platform === "windows" ? `.\\build\\RelWithDebInfo\\${BINARIES[model]}.exe` : `./build/${BINARIES[model]}`;
}

export function reportProfile(report) {
  if (!["PT_PHYSICAL", "legacy"].includes(report.model)) return "custom";
  const model = report.model === "PT_PHYSICAL" ? "physical" : "legacy";
  if (!BACKENDS.includes(report.settings?.r_ptBackend)) return "custom";
  const c = { ...defaultConfig(model), backend: report.settings.r_ptBackend };
  if (report.source !== "demos/demo1.demo" || report.fingerprint !== "b3debb3af436474b" ||
      report.frames !== 2148 || report.width !== c.width || report.height !== c.height ||
      report.spp !== c.spp || report.batch !== 4 || report.dispatches_per_frame !== 2 ||
      report.pacing !== "uncapped" || report.save_images !== false) return "custom";
  return Object.entries(configSettings(c)).every(([key, value]) => report.settings[key] === value)
    ? `${model}-v1` : "custom";
}
