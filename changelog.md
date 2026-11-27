---
title: Changelog
eyebrow: Development / Field notes
intro: "Renderer updates, fixes and what's next."
permalink: /changelog/
---
[Releases](https://github.com/{{ site.source_repository }}/releases)
&middot; [All commits](https://github.com/{{ site.source_repository }}/commits/{{ site.source_branch }})

## 27 November 2026 / current development

- **OpenCL backend**: AMD, Intel and NVIDIA GPUs; `d3ptmark-le` now includes the legacy
  path tracer, `d3ptmark-pt` the physical one.
- **Benchmark options**: `uncapped` (no 30 Hz cap, vsync off) and `save_image 0|1`, recorded
  in reports and kept apart on the leaderboard.
- **Headless runs** (`--headless`): no window or display, exit codes for scripts;
  `benchmark.sh` / `benchmark.bat` run the preset matrix on both binaries.
- **Telemetry**: CPU temperature, utilization and power, plus GPU sensors for AMD and Intel
  on Linux and any GPU on Windows.
- **New standard v1**: 1280x1024, uncapped, no image writes. Earlier submissions need a rerun.

## 24 November 2026

Source snapshot [`191e491`](https://github.com/{{ site.source_repository }}/commit/191e491c88dd68afcc491c305a5f91cfe2a8c31d), not a binary release.

- GL benchmark captures and reports, with no skipped demo frames.
- Fixed false GL readback aborts; tested all 2,148 stock demo frames.
- Unified `r_ptUI`, replacing `r_ptPhysicalUI`.
- Gameplay/cinematic presets and Mars sky defaults.
- Better grazing-angle GGX sampling.
- Emissive material, flashlight mask and denoiser fixes.

## Earlier milestones

Physical lighting and camera controls, material tuning, volumetrics, denoising,
and PT capture tools.

## Next

More hardware reports, fewer visual bugs, and better low-sample gameplay.
