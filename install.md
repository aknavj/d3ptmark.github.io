---
title: Get Doom 3 path traced
eyebrow: Field manual / Setup
intro: "Bring the original game and a CUDA-capable NVIDIA GPU."
permalink: /install/
---
<div class="actions"><a class="button" href="https://github.com/{{ site.source_repository }}/releases">Downloads & releases</a>
<a class="button secondary" href="https://github.com/{{ site.source_repository }}/tree/{{ site.source_branch }}">Browse source</a></div>

**No prebuilt releases as of 24 November 2026.** Build from source below.

## 1. Bring the original game

You need **Doom 3 1.3.1**, not BFG Edition. Game data is not included.
Follow [dhewm3's data installation guide](https://dhewm3.org/#how-to-install)
to set up your original `base/pak*.pk4` files.

## 2. Prepare a CUDA build

Install CMake, the CUDA Toolkit, a CUDA-supported C/C++ compiler, NVIDIA drivers,
and SDL2/OpenAL Soft development packages.
[Full requirements](https://github.com/{{ site.source_repository }}/blob/{{ site.source_branch }}/README.md#compiling).

```sh
git clone --branch pt-refactor https://github.com/d3ptmarkdhewm3-cupt.git
cd dhewm3-cupt
```

### Experimental physical build

```sh
cmake -S neo -B build-physical \
  -DCUDA_PATHTRACER=ON -DIMGUI=ON -DPT_PHYSICAL=ON
cmake --build build-physical --parallel 2
```

### Doom 3-style PT build

```sh
cmake -S neo -B build-legacy \
  -DCUDA_PATHTRACER=ON -DIMGUI=ON -DPT_PHYSICAL=OFF
cmake --build build-legacy --parallel 2
```

Use separate build directories to keep both rendering models.

## 3. Run

Keep the matching game libraries alongside the new engine. On Linux, point
`fs_basepath` at the directory containing your game's `base/` folder:

```sh
./build-physical/dhewm3 +set fs_basepath /path/to/doom3
```

For the other model, run `build-legacy/dhewm3`.

In the game console:

```text
r_ptDraw 1
r_ptMode 0
r_ptPreset gameplay_med
bind F11 "r_ptUI"
map game/enpro
```

[Next: run a benchmark]({{ '/benchmark/' | relative_url }}).
