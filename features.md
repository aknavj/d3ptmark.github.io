---
title: The renderer
eyebrow: Render lab / Technology
intro: "Two path-tracing models. One engine. Stock OpenGL kept intact."
permalink: /features/
---
## One engine, two PT models

Choose the model when building with **`PT_PHYSICAL`**. Both use CUDA and keep
stock OpenGL available. You cannot switch between PT models at runtime.

<div class="table-wrap" role="region" aria-label="Path tracer model comparison" tabindex="0" markdown="1">

| | Doom 3-style PT (`OFF`) | Physical PT (`ON`) |
|---|---|---|
| Lighting | Original light falloff and artistic controls | Inverse-square falloff and lumen/lux controls |
| Materials | Converted Doom 3 materials | Energy-aware GGX shading and IOR controls |
| Camera | Game-view framing | Photographic exposure, lens settings and depth of field |
| Fog | Legacy volumetrics | Physical single scattering |
| Sky | Mars gradient backdrop | Mars environment lighting |

</div>

## Features

- Indirect lighting, emissive surfaces, reflections and textured materials.
- Progressive sampling and separate diffuse, specular and fog denoising.
- Tone mapping, bloom and lens effects.
- Gameplay and cinematic presets, from `low` to `ultra`, plus `custom`.
- `r_ptUI` for tuning; physical builds also include a material inspector.
- GL/PT image captures, benchmark reports and optional hardware telemetry.

```text
bind F11 "r_ptUI"
r_ptPreset gameplay_med
```

For cleaner, slower captures:

```text
r_ptPreset cinematic_high
```

## Requirements and limits

A compatible **NVIDIA GPU** is required; AMD and Intel PT backends are not
implemented. **Other backends are planned.**

This is experimental: materials are approximations, some effects
still use OpenGL, and denoising can soften detail. Physical shutter settings
change exposure, not motion blur.

[Read the engine documentation](https://github.com/{{ site.source_repository }}/blob/{{ site.source_branch }}/README.md)
or [inspect the source](https://github.com/{{ site.source_repository }}/tree/{{ site.source_branch }}/neo/renderer_pt).
