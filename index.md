---
home: true
description: "Doom 3 was a GPU workout in 2004. Let's do it again, this time with path tracing."
---
{% assign capture = '/assets/images/compare-' %}
<section id="intro" class="hero compare-hero" aria-labelledby="hero-title">
  <figure class="hero-stage tri-compare" data-tri-compare aria-label="The same Doom 3 frame rendered by OpenGL, d3ptmark-le and d3ptmark-pt">
    <img class="tri-gl" src="{{ capture | append: 'gl.png' | relative_url }}" alt="OpenGL rendering of a Doom 3 corridor with a worker behind a window" width="1280" height="800" fetchpriority="high">
    <img class="tri-le" src="{{ capture | append: 'le.png' | relative_url }}" alt="The same frame path traced by d3ptmark-le, the Doom 3-style model" width="1280" height="800">
    <img class="tri-pt" src="{{ capture | append: 'pt.png' | relative_url }}" alt="The same frame path traced by d3ptmark-pt, the physical model" width="1280" height="800">
    <span class="tri-label tri-label-gl">OpenGL</span>
    <span class="tri-label tri-label-le">d3ptmark-le</span>
    <span class="tri-label tri-label-pt">d3ptmark-pt</span>
    <span class="tri-line" data-split="a" role="slider" tabindex="0" aria-label="Divider between OpenGL and d3ptmark-le" aria-valuemin="0" aria-valuemax="100" aria-valuenow="33"></span>
    <span class="tri-line" data-split="b" role="slider" tabindex="0" aria-label="Divider between d3ptmark-le and d3ptmark-pt" aria-valuemin="0" aria-valuemax="100" aria-valuenow="67"></span>
  </figure>
  <div class="hero-overlay">
    <div class="hero-content">
      <div class="hero-copy">
        <p class="eyebrow">2004 was just the warm-up</p>
        <h1 id="hero-title"><span class="hero-game">Doom 3</span><span class="hero-edition">Path traced.</span></h1>
        <p class="hero-tagline">Same hell. <span>New light.</span></p>
        <div class="actions">
          <a class="button" href="{{ '/install/' | relative_url }}">Get started</a>
          <a class="button secondary" href="{{ '/benchmark/#benchmark-builder' | relative_url }}">Run benchmark <span aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
    </div>
  </div>
  <div class="hero-information">
    <p class="lead">Doom 3 tortured our GPUs in 2004. Let's do it again, with path tracing.</p>
    <div class="premiere-footer">
      <p class="hero-requirements">Experimental path tracer for CUDA and OpenCL. Original Doom 3 and a compatible GPU required.</p>
    </div>
    <p class="caption">One frame, three renderers: OpenGL, the Doom 3-style path tracer (<code>d3ptmark-le</code>)
      and the physical path tracer (<code>d3ptmark-pt</code>). Drag the lines, or focus one and use the arrow keys.</p>
  </div>
</section>

<div class="home-content">
<dl class="spec-strip" aria-label="Project at a glance">
  <div><dt>The original</dt><dd>Doom 3 / 2004</dd></div>
  <div><dt>Two PT models</dt><dd>Physical + Legacy</dd></div>
  <div><dt>PT backends</dt><dd>CUDA + OpenCL</dd></div>
  <div><dt>The project</dt><dd>Free &amp; open source</dd></div>
</dl>

<section class="home-section home-models" aria-labelledby="models-title">
  <div class="section-heading">
    <div><p class="eyebrow">The renderer</p><h2 id="models-title" class="section-title">Two takes.<br><span>One dark place.</span></h2></div>
    <p>One build, two binaries. Different lighting models.<br>Stock OpenGL stays available in both.</p>
  </div>
  <div class="model-grid">
    <article class="model-card">
      <div class="model-label"><span>01 / Doom 3-style</span><span>d3ptmark-le</span></div>
      <h3>Keep the atmosphere.</h3>
      <p>Original light falloff and artistic controls, rebuilt with path tracing.</p>
      <ul><li>Familiar game-view framing</li><li>Legacy volumetric lighting</li></ul>
    </article>
    <article class="model-card model-physical">
      <div class="model-label"><span>02 / Physical</span><span>d3ptmark-pt</span></div>
      <h3>Follow the light.</h3>
      <p>Inverse-square lighting, energy-aware materials and a photographic camera.</p>
      <ul><li>Exposure, lenses and depth of field</li><li>Physical fog and Mars environment lighting</li></ul>
    </article>
  </div>
  <div class="section-foot"><p>CUDA for NVIDIA. OpenCL for AMD, Intel and NVIDIA.</p><a class="text-link" href="{{ '/features/' | relative_url }}">Compare renderer features <span aria-hidden="true">&rarr;</span></a></div>
</section>

<section class="home-section benchmark-callout" aria-labelledby="challenge-title">
  <div class="challenge-copy">
    <p class="eyebrow">Community GPU benchmark</p>
    <h2 id="challenge-title" class="section-title">Your GPU.<br><span>Your result.</span></h2>
    <p>Same demo. Every frame. No skipping.<br>Help build the leaderboard, one honest run at a time.</p>
    <div class="actions">
      <a class="button" href="{{ '/benchmark/#benchmark-builder' | relative_url }}">Configure your run</a>
      <a class="button secondary" href="{{ '/leaderboard/' | relative_url }}">View leaderboard</a>
    </div>
    <p class="caption">Every frame converges fully before the next. Captured FPS is not gameplay FPS.</p>
  </div>
  <ol class="challenge-steps">
    <li><span>01</span><div><h3>Set your challenge</h3><p>Choose your build, settings and resolution.</p></div></li>
    <li><span>02</span><div><h3>Run the demo</h3><p>Headless or windowed: timings plus GPU and CPU telemetry.</p></div></li>
    <li><span>03</span><div><h3>Share the evidence</h3><p>Submit your report and a preview for review.</p></div></li>
  </ol>
</section>

<div class="section-foot home-notes"><p>Gameplay presets for playing. Cinematic presets for slower, cleaner captures.</p><a class="text-link" href="{{ '/changelog/' | relative_url }}">Development log <span aria-hidden="true">&rarr;</span></a></div>

{% include support.html %}

<aside class="notice safety-note">
<strong>Free software. No warranty. Please don't set your GPU on fire.</strong>
Keep its thermal and power protections enabled.
</aside>
</div>
