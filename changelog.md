---
title: Changelog
eyebrow: Development / Field notes
intro: "Renderer updates, fixes and what's next."
permalink: /changelog/
---
[Releases](https://github.com/{{ site.source_repository }}/releases)
&middot; [All commits](https://github.com/{{ site.source_repository }}/commits/{{ site.source_branch }})

## 24 November 2026 / current development

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
