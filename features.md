---
title: The renderer
eyebrow: Render lab / Technology
intro: "Two path-tracing models. One engine. Stock OpenGL kept intact."
permalink: /features/
---
## One engine, two PT models

One build produces both: **`d3ptmark-pt`** with the physical model and **`d3ptmark-le`**
with the Doom 3-style model. Both keep stock OpenGL available (`r_ptDraw 0`) and use the
same CUDA or OpenCL backends. Pick the model by starting the matching binary.

<div class="table-wrap" role="region" aria-label="Path tracer model comparison" tabindex="0" markdown="1">

| | Doom 3-style PT (`d3ptmark-le`) | Physical PT (`d3ptmark-pt`) |
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
- GL/PT image captures and benchmark reports with GPU and CPU telemetry.
- Uncapped and headless benchmark runs for servers and scripts.

```text
bind F11 "r_ptUI"
r_ptPreset gameplay_med
```

For cleaner, slower captures:

```text
r_ptPreset cinematic_high
```

## Requirements and limits

**CUDA** needs an NVIDIA GPU (Turing or newer). **OpenCL 1.2** runs on AMD, Intel and
NVIDIA GPUs; its kernels are compiled on first use and cached. `r_ptBackend auto` prefers
CUDA when both are available.

This is experimental: materials are approximations, some effects
still use OpenGL, and denoising can soften detail. Physical shutter settings
change exposure, not motion blur.

[Read the engine documentation](https://github.com/{{ site.source_repository }}/blob/{{ site.source_branch }}/README.md)
or [inspect the source](https://github.com/{{ site.source_repository }}/tree/{{ site.source_branch }}/neo/renderer_pt).
