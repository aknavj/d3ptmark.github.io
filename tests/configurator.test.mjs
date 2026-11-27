import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { QUALITY_PRESETS, defaultConfig, validateConfig, configSettings, configProfile,
  generateBenchmark, benchmarkBatch, reportProfile } from "../assets/js/benchmark-config.js";

for (const model of ["physical", "legacy"]) {
  test(`${model}: standard, custom and reset profiles`, () => {
    const c = defaultConfig(model), output = generateBenchmark(c);
    assert.equal(output.profile, `${model}-v1`);
    assert.equal(output.batch, 4);
    assert.equal(output.width, 1280); assert.equal(output.height, 1024);
    assert.match(output.config, /r_ptBenchmark demo1 8 uncapped save_image 0\n$/);
    assert.match(output.config, /^set r_ptBackend cuda$/m);
    assert.doesNotMatch(output.config, /\n(?:quit|vid_restart)|set PT_PHYSICAL/);
    assert.doesNotMatch(output.config, /;/);
    assert.match(output.command, /r_customWidth' '1280'.*r_customHeight' '1024'.*\+exec/);
    assert.match(output.command, new RegExp(`^'\\./build/d3ptmark-${model === "physical" ? "pt" : "le"}' `));
    assert.doesNotMatch(output.command, /--headless/);
    assert.match(generateBenchmark(c, { headless: true }).command, /^'[^']+' '--headless' /);
    // either backend is the standard; capped or image-saving runs are custom
    assert.equal(configProfile({ ...c, backend: "opencl" }), `${model}-v1`);
    assert.match(generateBenchmark({ ...c, backend: "opencl" }).config, /^set r_ptBackend opencl$/m);
    assert.match(generateBenchmark({ ...c, uncapped: false, saveImages: true }).config, /r_ptBenchmark demo1 8 save_image 1\n$/);
    assert.equal(output.filename, `ptbench-${model}-v1.cfg`);
    assert.equal(configProfile({ ...c, spp: "8", width: "1280" }), `${model}-v1`);
    for (const patch of [{ spp: 9 }, { width: 800 }, { height: 720 }, { denoise: false }, { fog: true }, { demo: "other_demo" },
      { uncapped: false }, { saveImages: true }]) {
      assert.equal(configProfile({ ...c, ...patch }), "custom");
    }
    assert.equal(configProfile(defaultConfig(model)), `${model}-v1`);
    if (model === "legacy") assert.doesNotMatch(output.config, /^set r_ptPhysical/m);
    else assert.match(output.config, /^set r_ptPhysicalDOF 0$/m);
  });
  for (const [preset, values] of Object.entries(QUALITY_PRESETS)) {
    test(`${model}: ${preset} emits exact quality budgets after preset callbacks`, () => {
      const [scale, batch, depth, lights] = values;
      const result = generateBenchmark({ ...defaultConfig(model), preset, scale, batch, depth, lights });
      assert.equal(result.settings.r_ptPreset, preset);
      assert.deepEqual([result.settings.r_ptRenderScale, result.settings.r_ptSamplesPerPixel,
        result.settings.r_ptMaxDepth, result.settings.r_ptMaxLightSamples], values);
      assert.ok(result.config.indexOf(`set r_ptPreset ${preset}\n`) < result.config.indexOf("set r_ptRenderScale "));
    });
  }
}

test("manual quality edits become custom without a fixed preset restoring budgets", () => {
  const c = { ...defaultConfig(), depth: 7 };
  assert.equal(validateConfig(c).preset, "custom");
  assert.equal(configSettings(c).r_ptMaxDepth, 7);
  assert.match(generateBenchmark(c).config, /set r_ptPreset custom/);
});

test("batch sizing divides the exact target and respects the renderer's 64-pixel minimum", () => {
  for (const spp of [1, 5, 8, 10, 31, 100000]) for (const limit of [1, 4, 16, 64]) {
    const batch = benchmarkBatch(spp, limit);
    assert.equal(spp % batch, 0); assert.ok(batch <= Math.min(spp, limit));
  }
  const output = generateBenchmark({ ...defaultConfig(), width: 320, height: 240, scale: 0.1 });
  assert.equal(output.width, 64); assert.equal(output.height, 64);
});

for (const patch of [
  { width: "" }, { width: null }, { width: 319 }, { height: 239 }, { width: 7681 },
  { height: 4321 }, { spp: 0 }, { spp: 1.5 }, { spp: 100001 }, { batch: 65 }, { depth: 17 },
  { lights: 9 }, { scale: 0.09 }, { scale: Infinity }, { exposure: 11 }, { exposure: " " }, { model: null },
  { focalLength: 9 }, { focusDistance: 0.2 }, { denoise: "false" }, { preset: "__proto__" }, { model: "OpenGL" },
  { backend: "vulkan" }, { backend: "auto" }, { uncapped: "yes" }, { saveImages: 1 }
]) test(`rejects invalid configurator values ${JSON.stringify(patch)}`, () => {
  assert.throws(() => generateBenchmark({ ...defaultConfig(), ...patch }));
});

for (const demo of ["../demo", "demos/demo1.demo", "demo1;quit", "demo1\nquit", '"demo"', "$(id)", "a//b", "/demo1", ""]) {
  test(`rejects unsafe/ambiguous demo name ${JSON.stringify(demo)}`, () => {
    assert.throws(() => generateBenchmark({ ...defaultConfig(), demo }), /demo name/);
  });
}

test("launch paths are shell-quoted, never interpreted, and Windows uses PowerShell call syntax", () => {
  assert.equal(generateBenchmark({ ...defaultConfig(), model: undefined }).profile, "physical-v1");
  const path = "/games/Doom 3's $(echo SHOULD_NOT_RUN); folder";
  const generated = generateBenchmark(defaultConfig(), { executable: "/bin/printf", dataPath: path });
  const result = spawnSync("sh", ["-c", generated.command.replace("'/bin/printf'", "'/bin/printf' '%s\\n'")], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.split("\n").includes(path));
  const windows = generateBenchmark(defaultConfig("legacy"), { platform: "windows", executable: "C:\\Doom's PT\\dhewm3.exe", dataPath: "C:\\Doom 3" });
  assert.match(windows.command, /^& 'C:\\Doom''s PT\\dhewm3\.exe'/);
  assert.match(windows.command, /'fs_basepath' 'C:\\Doom 3'/);
  for (const launch of [{ executable: "" }, { executable: "bad\npath" }, { dataPath: "+quit" }, { platform: "cmd.exe" }]) {
    assert.throws(() => generateBenchmark(defaultConfig(), launch));
  }
});

test("profile recognition derives workload/settings, never trusts a submitted label", () => {
  for (const model of ["physical", "legacy"]) {
    const r = { model: model === "physical" ? "PT_PHYSICAL" : "legacy", source: "demos/demo1.demo",
      fingerprint: "b3debb3af436474b", frames: 2148, width: 1280, height: 1024, spp: 8, batch: 4,
      dispatches_per_frame: 2, pacing: "uncapped", save_images: false, settings: configSettings(defaultConfig(model)) };
    assert.equal(reportProfile(r), `${model}-v1`);
    assert.equal(reportProfile({ ...r, settings: configSettings({ ...defaultConfig(model), backend: "opencl" }) }), `${model}-v1`);
    assert.equal(reportProfile({ ...r, pacing: "capped_30hz" }), "custom");
    assert.equal(reportProfile({ ...r, save_images: true }), "custom");
    assert.equal(reportProfile({ ...r, height: 720 }), "custom");
    assert.equal(reportProfile({ ...r, settings: { ...r.settings, r_ptBackend: "auto" } }), "custom");
    assert.equal(reportProfile({ ...r, spp: 64, profile: `${model}-v1` }), "custom");
    assert.equal(reportProfile({ ...r, frames: 4 }), "custom");
    assert.equal(reportProfile({ ...r, fingerprint: "0000000000000000" }), "custom");
    assert.equal(reportProfile({ ...r, settings: { ...r.settings, r_ptDenoise: 0 } }), "custom");
    const missing = { ...r.settings }; delete missing.r_ptSkyIntensity;
    assert.equal(reportProfile({ ...r, settings: missing }), "custom");
  }
});
