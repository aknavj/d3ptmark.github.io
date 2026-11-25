---
title: Run, submit, repeat
eyebrow: Test chamber / Run & submit
intro: "Run the demo. Share your report. Help improve the renderer."
permalink: /benchmark/
---
## 1. Run

Choose your installed build, download a config, and copy it into your game's
`base/` folder. Close other GPU workloads, exit the engine, then use the launch
command below. Adjust its executable and game-data paths for your installation.

<section id="benchmark-builder" data-install-url="{{ '/install/' | relative_url }}">
  <div class="renderer-tabs" role="tablist" aria-label="Path tracer build">
    <button id="tab-physical" type="button" role="tab" data-model="physical" aria-controls="benchmark-options" aria-selected="true">Physical PT</button>
    <button id="tab-legacy" type="button" role="tab" data-model="legacy" aria-controls="benchmark-options" aria-selected="false" tabindex="-1">Legacy PT</button>
  </div>
  <div id="benchmark-options" role="tabpanel" aria-labelledby="tab-physical">
    <p id="required-build"></p>
    <p><a id="build-link" href="{{ '/install/' | relative_url }}">Build / download instructions</a></p>
    <div class="profile-heading"><strong id="profile-name">Site standard</strong>
      <button id="reset-profile" type="button" class="secondary">Reset to standard v1</button></div>
    <div class="form-grid">
      <label>Demo <input data-setting="demo" value="demo1" maxlength="100"></label>
      <label>Samples per pixel <input data-setting="spp" type="number" min="1" max="100000" step="1" value="8"></label>
      <label>Viewport width <input data-setting="width" type="number" min="320" max="7680" step="1" value="1280"></label>
      <label>Viewport height <input data-setting="height" type="number" min="240" max="4320" step="1" value="720"></label>
      <label>Quality <select data-setting="preset">
        <option value="gameplay_low">Gameplay / low</option><option value="gameplay_med">Gameplay / medium</option>
        <option value="gameplay_high">Gameplay / high</option><option value="gameplay_ultra">Gameplay / ultra</option>
        <option value="cinematic_low" selected>Cinematic / low</option><option value="cinematic_med">Cinematic / medium</option>
        <option value="cinematic_high">Cinematic / high</option><option value="cinematic_ultra">Cinematic / ultra</option>
        <option value="custom">Custom budgets</option>
      </select></label>
      <label class="check"><input data-setting="denoise" type="checkbox" checked>Denoising</label>
    </div>
    <details>
      <summary>Advanced rendering settings</summary>
      <div class="form-grid">
        <label>Render scale <input data-setting="scale" type="number" min="0.1" max="1" step="0.01" value="1"></label>
        <label>Samples per dispatch <input data-setting="batch" type="number" min="1" max="64" step="1" value="4"></label>
        <label>Maximum bounces <input data-setting="depth" type="number" min="1" max="16" step="1" value="3"></label>
        <label>Light samples <input data-setting="lights" type="number" min="1" max="8" step="1" value="2"></label>
        <label class="check"><input data-setting="fog" type="checkbox">Volumetric fog (expensive)</label>
      </div>
      <div data-model-only="physical" class="form-grid">
        <label>Exposure compensation (EV) <input data-setting="exposure" type="number" min="-10" max="10" step="0.1" value="0"></label>
        <label>Focal length (mm) <input data-setting="focalLength" type="number" min="10" max="200" step="0.1" value="35"></label>
        <label>Focus distance (m) <input data-setting="focusDistance" type="number" min="0.25" max="1000" step="0.05" value="3"></label>
        <label class="check"><input data-setting="dof" type="checkbox">Depth of field (expensive)</label>
      </div>
      <label data-model-only="legacy" hidden>Exposure multiplier <input data-setting="legacyExposure" type="number" min="0.01" max="100" step="0.01" value="1"></label>
    </details>
    <p id="builder-summary" class="caption"></p>
    <p id="budget-warning" class="caption"></p>
    <div class="form-grid">
      <label>Launch command for <select id="command-platform"><option value="linux">Linux shell</option><option value="windows">Windows PowerShell</option></select></label>
      <label>Engine executable <input id="engine-path" maxlength="500" spellcheck="false"></label>
    </div>
    <label>Game data directory (optional, contains base/) <input id="game-data-path" maxlength="500" placeholder="/path/to/doom3" spellcheck="false"></label>
    <label>Generated config <textarea id="generated-config" readonly rows="8" spellcheck="false"></textarea></label>
    <p><button id="download-config" type="button" data-output-action>Download .cfg</button>
      <button id="copy-config" type="button" class="secondary" data-output-action>Copy config</button></p>
    <label>Launch command (sets resolution at startup) <textarea id="launch-command" readonly rows="4" spellcheck="false"></textarea></label>
    <button id="copy-command" type="button" class="secondary" data-output-action>Copy command</button>
    <p id="builder-error" class="error" role="alert"></p>
    <p id="builder-status" role="status" aria-live="polite"></p>
  </div>
</section>

Standard v1 uses stock `demo1`, 1280x720, 8 spp, cinematic-low budgets,
denoising on, and fog/DOF off. Changing these settings makes a custom run.
Use stock assets and no custom material overrides. Configs change benchmark
CVars; other archived settings can still differ and are checked when grouping reports.

Every frame is saved, with playback capped at 30 Hz.
**Capture FPS includes pacing and image writes; it is not gameplay FPS.**

For an OpenGL reference, wait for PT to finish, then run:
```text
r_glBenchmark demo1
```

Pair images by frame number, not run number:

```text
screenshots/ptbench/demo1/8spp_run_NNNNN/frame_000001_8spp.png
screenshots/glbench/demo1/run_NNNNN/frame_000001.png
```

Match resolution and camera settings; see the
[comparison notes]({{ '/comparisons/' | relative_url }}).
Cancel with `r_ptAbort` or `r_glAbort`; saved frames remain.
Do not append an immediate `quit` to a capture command.

## 2. Keep the report

Find reports under your engine's save path:
```text
base/screenshots/ptreports/benchmark/run_NNNNN/
base/screenshots/glreports/benchmark/run_NNNNN/
```

ZIP `metadata.json`, `frames.csv`, `settings.csv`, and optional `telemetry.csv`.
Choose one preview image, not the full image sequence.
**Review the ZIP for private paths and arguments. Never include game data or keys.**

## 3. Submit

The form checks your files locally and prepares a summary without local paths
or startup arguments. **Nothing is uploaded automatically.**

Benchmark submissions go to the
[submission repository's issues](https://github.com/{{ site.community_repository }}/issues).

<form id="report-form" data-repository="{{ site.community_repository | escape }}">
  <div class="form-grid">
    <label>metadata.json <input id="metadata-file" type="file" accept=".json,application/json" required></label>
    <label>frames.csv <input id="frames-file" type="file" accept=".csv,text/csv" required></label>
    <label>telemetry.csv (optional, adds GPU charts) <input id="telemetry-file" type="file" accept=".csv,text/csv"></label>
    <label>Preview image (stays local) <input id="preview-file" type="file" accept="image/png,image/jpeg,image/webp"></label>
    <label>Driver version (optional) <input id="driver-version" type="text" maxlength="80" placeholder="NVIDIA driver version"></label>
  </div>
  <p class="caption">Limits: metadata 2 MB, each CSV 32 MB, image 5 MB. Charts share up to 120 averaged buckets, not raw telemetry.</p>
  <button type="submit">Check report</button>
  <p id="report-status" role="status" aria-live="polite"></p>
  <img id="local-preview" class="local-preview" alt="Your selected benchmark preview" hidden>
  <section id="submission-result" hidden>
    <h3>Review and share</h3>
    <dl id="report-summary" class="summary"></dl>
    <p id="ranking-warning" class="notice"></p>
    <label>Copy this into your GitHub issue <textarea id="submission-markdown" readonly rows="14" spellcheck="false"></textarea></label>
    <p><button id="copy-submission" type="button" class="secondary">Copy Markdown</button>
    <button id="download-submission" type="button" class="secondary">Download summary</button>
    <a id="preview-report" href="{{ '/report/' | relative_url }}" class="button secondary">Preview report & graphs</a></p>
    <label class="check"><input id="publish-consent" type="checkbox"> I reviewed the summary and understand that GitHub submissions and attachments are public.</label>
    <p><button id="open-submission" type="button" disabled>Open GitHub issue</button></p>
    <p>Paste the text above into the issue, attach your reviewed ZIP, and upload
    the preview. A GitHub account is required. Results appear after maintainer review.</p>
  </section>
</form>

<noscript><p class="notice">Enable JavaScript to check files here, or
<a href="https://github.com/{{ site.community_repository }}/issues/new?title=Benchmark%20submission">open a submission issue</a>
and attach a reviewed report and preview.</p></noscript>

## Comparing results

Match the source revision, renderer, demo, resolution, samples and settings.
Dirty or unknown revisions are accepted as feedback, but not ranked.
Stock `demo1` has 2,148 frames and fingerprint `b3debb3af436474b`.
Site profiles are versioned reference configs, not independently certified results.
GL does not report PT GPU timings.

Found a rendering bug or an incomplete run?
[Report it here](https://github.com/{{ site.source_repository }}/issues)
with your revision, settings and a screenshot.
