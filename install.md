---
title: Get Doom 3 path traced
eyebrow: Field manual / Setup
intro: "Bring the original game and a CUDA or OpenCL capable GPU."
permalink: /install/
---
<div class="actions"><a class="button" href="https://github.com/{{ site.source_repository }}/releases">Downloads & releases</a>
<a class="button secondary" href="https://github.com/{{ site.source_repository }}/tree/{{ site.source_branch }}">Browse source</a></div>

**No prebuilt releases as of 27 November 2026.** Build from source below.

## 1. Bring the original game

You need **Doom 3 1.3.1**, not BFG Edition. Game data is not included.
Follow [dhewm3's data installation guide](https://dhewm3.org/#how-to-install)
to set up your original `base/pak*.pk4` files.

## 2. Build

Install CMake, a C/C++ compiler and the SDL2/OpenAL Soft development packages, plus at
least one path tracer backend:

- **CUDA**: the NVIDIA CUDA Toolkit and an NVIDIA GPU (Turing or newer).
- **OpenCL 1.2**: only the OpenCL headers (`CL/cl.h`) at build time, and an AMD, Intel or
  NVIDIA GPU with an OpenCL driver at runtime.

[Full requirements](https://github.com/{{ site.source_repository }}/blob/{{ site.source_branch }}/README.md#requirements).

```sh
git clone --branch {{ site.source_branch }} https://github.com/{{ site.source_repository }}.git
cd d3ptmark
./build.sh          # Windows: build.bat -DDHEWM3LIBS=C:\path\to\dhewm3-libs\x86_64-w64-mingw32
```

One build produces both binaries in `build/` (Windows: `build\RelWithDebInfo\`), with
every backend whose toolchain was found:

| Binary | Renderer |
|--------|----------|
| `d3ptmark-pt` | Physical path tracer, plus stock OpenGL |
| `d3ptmark-le` | Legacy (Doom 3-style) path tracer, plus stock OpenGL |

## 3. Run

Keep the game libraries next to the binaries and point `fs_basepath` at the directory
containing your game's `base/` folder:

```sh
./build/d3ptmark-pt +set fs_basepath /path/to/doom3
```

Use `build/d3ptmark-le` for the legacy model. In the game console:

```text
r_ptBackend auto    // or cuda / opencl; r_ptInfo shows the active device
r_ptPreset gameplay_med
bind F11 "r_ptUI"
map game/enpro
```

`r_ptDraw 0` switches back to OpenGL. The first OpenCL start compiles the kernels, which
can take tens of seconds; later starts use a cache.

[Next: run a benchmark]({{ '/benchmark/' | relative_url }}).
