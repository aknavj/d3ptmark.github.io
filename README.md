# Doom 3 / Path Traced benchmark site

A small Markdown-first Jekyll site for GitHub Pages. No JS framework, database,
analytics, or third-party browser dependencies. The engine sources are separate;
this directory is the **site repository root**, not an engine patch.

The Doom 3-inspired skin uses original CSS metal/terminal panels, blue displays,
amber warnings and system fonts. It does not redistribute game UI assets or load
external fonts. Chart colors follow the shared CSS palette. Comparison and report
images are not tinted, filtered or covered with scanlines; A/B comparisons stay intact.
The homepage opens with a borderless, viewport-wide intro directly below
navigation, with the title, tagline and actions overlaid on its local poster.
A two-model renderer overview, a real denoising slider and a benchmark call to action follow. It
reuses the gallery's local captures and comparison component, without remote art
or invented performance scores.

All pages share the same cinematic background, display headings, accent rules,
panel palette and aligned site frame. Documentation keeps a narrower reading
column; leaderboard and report pages use the full content width. Inner-page
headers use `eyebrow` and `intro` front matter. Tables scroll within their own
frames on small screens, and the same support panel appears on Home and About.

## Preview

Ruby 3.3+ and Bundler are recommended. Node 22+ runs the dependency-free tests and
leaderboard import.

```sh
bundle install
npm test
npm run refresh
bundle exec jekyll serve --host 127.0.0.1
```

Open `http://127.0.0.1:4000`. Pages, navigation, install instructions and the
gallery work without a backend. The report importer works on localhost or HTTPS.
No npm install is necessary.

`npm run refresh` fetches approved GitHub submissions, rebuilds `_site/`, and
checks the generated links. Restarting Jekyll alone does not fetch issues.
Run the refresh again when submissions change; an existing Jekyll watcher can
also rebuild when the imported data changes. A failed import stops the script
before rebuilding, rather than replacing the leaderboard with empty data.

```sh
npm run refresh -- /doom3-benchmark
```

`_site/`, `.bundle/`, and installed gems are local build outputs and are ignored.
Give a second preview its own `--destination` when using a different baseurl;
otherwise both Jekyll instances overwrite the same `_site/` output.

## Homepage intro video

Set `youtube_intro_url` in `_config.yml` to your public YouTube watch/share URL
or 11-character video ID, then restart Jekyll or rebuild Pages. Leave it empty
to replace the player with a static capture. The intro is the hero's main showcase,
ahead of the project summary and renderer overview. Its poster is a local
development capture, not a YouTube thumbnail or a promised frame from the video.
Only the hero poster uses a cover crop and a dark gradient for readable overlay
text; gallery comparisons remain unchanged. The static poster and information
also remain when JavaScript is disabled.

The responsive player uses `youtube-nocookie.com` and is created only after a
visitor clicks **Load intro video**. No YouTube thumbnails, scripts or iframes
are loaded beforehand, and autoplay is disabled. On loading, the information
moves below the player so it never covers the video or its controls. The embedded
video is not cropped and keeps a minimum 200px player height on narrow screens.
A **Watch on YouTube** link
remains available if embedding is blocked or disabled for the video. JavaScript
is required to enable the player; the rest of the homepage stays usable without it.
The iframe sends an origin referrer, as required by YouTube for embedded playback.
Narrow layouts keep the player's required minimum height of 200 pixels.

## PayPal donations

Set `paypal_donate_url` in `_config.yml` to your public HTTPS PayPal Donate or
paypal.me URL, then restart Jekyll (or rebuild Pages). The homepage and About page
share the support section. Until a URL is configured, they show a coming-soon
note instead of a placeholder payment link. No PayPal scripts are embedded.
Donations are optional; no features are locked behind payment.

## Publish on GitHub Pages

1. Put the **contents of this directory**, including `.github/`, at the root of
   the GitHub repository that will host the site. No repository was created,
   pushed or published automatically.
2. Set `community_repository: owner/repo` in `_config.yml` to the public repository
   whose issues should receive submissions. It is configured for
   `aknavj/d3ptmark-submissions`. Set `source_repository`/`source_branch`
   separately for source and download links.
3. If submissions live elsewhere, copy `.github/ISSUE_TEMPLATE/benchmark.md` into
   that repository too. The importer also works with a plain new issue: paste
   its prepared fenced JSON, attach the reviewed report ZIP, and upload the preview.
4. Create the label **`benchmark-approved`** in the submission repository. Only
   maintainers should apply it, after reviewing the archive, preview, complete
   frame sequence and settings history. GitHub repositories restrict label
   management to users with suitable permissions.
5. In the **site** repository, enable Pages with **GitHub Actions** as the source.
   Ensure Actions and the `github-pages` deployment environment are allowed.
6. Push to `main`, `master`, or `pt-refactor`, or run **Build benchmark site**
   manually. Change the workflow branch filter if your default branch differs.
   The workflow gets the project subpath from `configure-pages`, so the same site
   supports both project Pages and an `owner.github.io` site.
7. Optionally set `url` in `_config.yml` to the final HTTPS origin, without a
   trailing slash; `baseurl` is the project path. The workflow overrides the latter.

Issue events refresh the site when submissions are in the same repository.
An hourly scheduled build also refreshes a separate public submission repository.
Scheduled workflows run from the default branch and GitHub may delay/disable them
on inactive repositories; manual dispatch and pushes remain available.

The workflow reads public GitHub issue data with `GITHUB_TOKEN`, never issue-body
expressions in shell commands. It does **not** download/unpack submitted archives,
run code from an issue, or fetch arbitrary attachment URLs. Submission content
is validated, allowlisted and rendered as text. No write permission to issues
or source files is needed; only the deployment job can publish Pages.

## Publish on GitLab Pages

Put this directory's contents at the root of your GitLab site repository.
The included `.gitlab-ci.yml` runs on the default branch for pushes, manual
pipelines and pipeline schedules. It tests and imports GitHub submissions with
Node 22, builds with Ruby 3.3, then checks the output before publishing `_site/`
to GitLab Pages. Import, test or build failures prevent deployment.

The pipeline derives Jekyll's `url` and `baseurl` from `CI_PAGES_URL`, supporting
both root sites and project subpaths. The URL is available under **Deploy >
Pages** after deployment. `d3ptmark.github.io` is a GitHub Pages address, not a
GitLab Pages address; GitLab.com normally uses `*.gitlab.io`. No domain is
hardcoded in the pipeline.

In **Build > Pipeline schedules**, create an hourly schedule such as
`23 * * * *` targeting the default branch. A YAML file cannot create a GitLab
pipeline schedule by itself. GitHub issue events do not automatically trigger
GitLab pipelines, so use the schedule or **Build > Pipelines > New pipeline**
to refresh without a commit. This pipeline publishes static files; it does
not restart a local Jekyll service.

For public submission issues, no GitHub token is required. Optionally add
`GH_TOKEN` as a masked CI/CD variable in GitLab to increase the GitHub API rate
limit. Use only read access; never put credentials in the repository. A GitLab
job token is not a GitHub API token.

## Submitting and reviewing

The browser accepts `metadata.json` and `frames.csv` from a completed schema-1
benchmark. It checks row counts, source order/timestamps, dimensions, spp and
dispatch budgets, timing totals, known renderer models, and GL's unavailable GPU
metrics. Uploading a preview is a separate, explicit action on GitHub.

Its JSON summary omits startup arguments, local image paths and arbitrary metadata.
Only numeric renderer settings and known preset/backend strings are retained.
Unrepresentable settings make an entry development-only, not silently comparable.
The source archive itself is **not sanitized** by this form.

The prepared Markdown goes into the issue body. A JSON attachment alone is not
ingested: the workflow deliberately does not download user-supplied files. A
reviewer checks the original archive (especially `settings.csv` for mid-run
changes), confirms the preview isn't broken, and labels the issue. Approval is
manual trust, not independent performance verification.

Each refresh regenerates `_data/submissions.json` from currently approved issues,
both open and closed. Closing an issue does not approve it: it must retain
`benchmark-approved`. Removing the label removes the entry at the next refresh. Invalid approved issues
are explicitly logged and skipped. API failures fail the build instead of
publishing an empty success-shaped table.

Preview links must be public, query-free GitHub attachments:
`https://github.com/user-attachments/assets/...` or
`https://user-images.githubusercontent.com/...png`. GitHub-generated Markdown
image links and HTML `<img src="...">` links are supported. Images are linked,
not copied into the repository.

```sh
# Refresh submissions and rebuild; GH_TOKEN improves the public API rate limit.
npm run refresh
```

`npm run sync` is also available for importing data without rebuilding.
Leaderboard data is generated from approved issues, not invented scores.
The initial development report
used a Quadro RTX 4000, physical PT, 512x384, 64 spp and 2,148 frames. It took
9.41 hours with custom settings and dirty sources, so it is not a ranked result
or a gameplay performance claim.

## Benchmark configurator

The Run & submit page targets separate Physical PT / Legacy PT **builds**;
there is no runtime CVar that switches rendering models. Build links, generated
CVars and launch paths follow the selected tab. Windows commands target
PowerShell; the example multi-configuration build directory is `RelWithDebInfo`.
Users must adjust the executable path to match their actual build.

Download the generated `.cfg` into the game's `base/` search directory, then
launch the engine with the generated command. Resolution is applied at startup,
not with a disruptive `vid_restart` during an asynchronous capture. Do not
append `quit`. Benchmark CVars may be archived on exit.

`benchmark-config.js` defines versioned **physical-v1 / legacy-v1**
reference workloads: stock demo1 (fingerprint `b3debb3af436474b`, 2,148 frames),
1280x720, 8 spp, cinematic_low, batch 4, denoising on, no fog/DOF, and explicit
baseline rendering/camera settings. Keep v1 definitions unchanged when adding
future profiles. Edits become custom. Preset CVars precede explicit budgets
because the engine applies preset callbacks immediately.

Profile recognition is derived from reported settings and workload, not a
user-supplied profile label. It is not proof of stock assets/material overrides.
Use original assets and no custom material overrides. Additional archived
settings remain part of the exact compatibility key, even for matching v1
profiles; different revisions, rendering models and settings never share ranks.

## Rankings, reports and charts

The leaderboard supports renderer/platform filters, hardware/user search,
sorting and 25-row pagination. All-workload browsing deliberately has no ranks.
Within an exact workload, ranks use captured FPS before search/platform filtering.
PT GPU stage time is separate; neither metric claims unrestricted gameplay FPS.

Each approved issue gets a stable `/report/?id=owner%2Frepo%2Fnumber` link with
hardware, capture statistics, settings, preview and source issue/archive link.
Optional local report previews use sessionStorage in the same browser tab and
never upload files. Its **Preview leaderboard row** button opens the same run
in the leaderboard layout, without approval, public data changes or ranks.
Local-preview URLs are not shareable public reports.

The importer derives timing charts and exact min/median/p95/max frame statistics
from the complete validated `frames.csv`. Optional `telemetry.csv` adds temperature,
utilization, power, VRAM and SM/memory-clock charts. Missing sensors stay null.
Charts contain **at most 120 contiguous bucket means** per source; they can hide
short spikes. Telemetry means use available sensor samples, not missing-value zeros.
Only numeric allowlisted chart fields are retained; sensor-error strings, paths
and startup arguments are not published. Existing schema-1 summaries without
history remain valid and show a clear unavailable-chart message.

`npm run sync` writes generated full summaries to `assets/data/reports/issue_N.json`
and a chart-free leaderboard index to `_data/submissions.json`. Stale generated
report files are removed when approval is withdrawn. Details are fetched only
when opening a report and checked against the index. Do not hand-edit these
generated files. API/validation failures remain visible; no sample leaderboard
entries are shipped. This is a static, manually reviewed system, not an
authenticated/anti-cheat benchmark service.

## Gallery provenance

Images were converted to **lossless WebP**, without exposure changes or retouching.
No game archives, raw benchmark reports, keys, or local configuration files are
distributed.

| Assets | Source capture | Context |
|---|---|---|
| `raw-8.webp`, `denoised-8.webp` | `sample-comparisons-800x600/{raw,denoised}_8spp.png` | Frozen `shot_demo001`, physical PT, 800x600 |
| `raw-64.webp`, `denoised-64.webp` | `sample-comparisons-800x600/{raw,denoised}_64spp.png` | Same view, fog on, +2 EV, denoiser strength 0.5 |
| `demo1-gl.webp` | GL benchmark `demo1`, frame 1 | Original 1024x768 |
| `demo1-physical.webp` | Physical PT benchmark `demo1`, 64 spp, frame 1 | 512x384, custom lens/DOF/exposure, dirty revision |

These are historical development images. The GL/PT pair has **different lens
settings** and is deliberately not presented as a pixel-aligned wipe or a speed
comparison. Denoiser wipes use the matched frozen-view pairs. The original game
images remain the property of their respective rights holders.

## Editing

- Pages: Markdown files at the root.
- Shared layout/navigation: `_layouts/default.html`.
- Comparison captions: `_data/gallery.yml`; files under `assets/images/`.
- Style: `assets/css/site.css`.
- Client importer and leaderboard: `assets/js/`.
- Reviewed issue ingestion: `scripts/sync-submissions.mjs`.
- Regression tests: `tests/`, run with `npm test`.

No hosting or GitHub credentials belong in this repository.
