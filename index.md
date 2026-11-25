---
home: true
description: "Doom 3 was a GPU workout in 2004. Let's do it again, this time with path tracing."
---
{% assign hero_capture = '/assets/images/denoised-64.webp' | relative_url %}
<section id="intro" class="hero video-intro" aria-labelledby="hero-title"{% if site.youtube_intro_url and site.youtube_intro_url != "" %} data-youtube-intro data-video-url="{{ site.youtube_intro_url | escape }}"{% endif %}>
  <div class="hero-stage">
    <img class="hero-poster" src="{{ hero_capture }}" alt="Teal lights and warm volumetric beams in a path-traced Doom 3 room" width="800" height="600" fetchpriority="high">
    {% if site.youtube_intro_url and site.youtube_intro_url != "" %}
    <div class="intro-screen" data-video-screen hidden>
      <button class="intro-load" data-video-load type="button" aria-describedby="intro-privacy">
        <span class="intro-play-control"><span class="intro-orb"><span class="intro-play" aria-hidden="true"></span></span><span class="intro-play-label">Load intro video</span></span>
      </button>
    </div>
    {% endif %}
  </div>
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
      <p class="hero-requirements">Experimental CUDA renderer. Original Doom 3 and a compatible NVIDIA GPU required.</p>
      <a class="text-link" href="{{ '/comparisons/' | relative_url }}">Explore the captures <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="intro-meta">
      <p class="caption">Poster / Development capture / Physical PT / 64 spp / Denoised</p>
      {% if site.youtube_intro_url and site.youtube_intro_url != "" %}
      <a data-video-watch class="text-link" rel="noreferrer" hidden>Watch on YouTube <span aria-hidden="true">&rarr;</span></a>
      {% endif %}
    </div>
    {% if site.youtube_intro_url and site.youtube_intro_url != "" %}
    <p id="intro-privacy" class="caption">Click to load YouTube's privacy-enhanced player. No autoplay.
      YouTube's privacy policy applies after loading.</p>
    <p data-video-status class="caption" role="status" aria-live="polite"></p>
    <noscript><p class="notice">Enable JavaScript to load the YouTube intro.</p></noscript>
    {% endif %}
  </div>
</section>

<div class="home-content">
<dl class="spec-strip" aria-label="Project at a glance">
  <div><dt>The original</dt><dd>Doom 3 / 2004</dd></div>
  <div><dt>Two PT models</dt><dd>Physical + Legacy</dd></div>
  <div><dt>Current PT backend</dt><dd>NVIDIA CUDA</dd></div>
  <div><dt>The project</dt><dd>Free &amp; open source</dd></div>
</dl>

<section class="home-section home-models" aria-labelledby="models-title">
  <div class="section-heading">
    <div><p class="eyebrow">The renderer</p><h2 id="models-title" class="section-title">Two takes.<br><span>One dark place.</span></h2></div>
    <p>Separate builds. Different lighting models.<br>Stock OpenGL stays available in both.</p>
  </div>
  <div class="model-grid">
    <article class="model-card">
      <div class="model-label"><span>01 / Doom 3-style</span><span>Legacy PT</span></div>
      <h3>Keep the atmosphere.</h3>
      <p>Original light falloff and artistic controls, rebuilt with path tracing.</p>
      <ul><li>Familiar game-view framing</li><li>Legacy volumetric lighting</li></ul>
    </article>
    <article class="model-card model-physical">
      <div class="model-label"><span>02 / Physical</span><span>Physical PT</span></div>
      <h3>Follow the light.</h3>
      <p>Inverse-square lighting, energy-aware materials and a photographic camera.</p>
      <ul><li>Exposure, lenses and depth of field</li><li>Physical fog and Mars environment lighting</li></ul>
    </article>
  </div>
  <div class="section-foot"><p>NVIDIA CUDA today. Other backends are planned.</p><a class="text-link" href="{{ '/features/' | relative_url }}">Compare renderer features <span aria-hidden="true">&rarr;</span></a></div>
</section>

<section class="home-section home-lab" aria-labelledby="lab-title">
  <div class="section-heading">
    <div><p class="eyebrow">The image lab</p><h2 id="lab-title" class="section-title">Less noise.<br><span>More Mars.</span></h2></div>
    <p>One frozen view. Eight samples per pixel.<br>Drag the slider to see the denoiser work.</p>
  </div>
  {% assign home_pair = site.data.gallery | where: "id", "denoise-8" | first %}
  {% include comparison.html pair=home_pair heading_level=3 %}
  <div class="section-foot"><p>Real development captures. No retouching.</p><a class="text-link" href="{{ '/comparisons/' | relative_url }}">Explore the A/B gallery <span aria-hidden="true">&rarr;</span></a></div>
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
    <p class="caption">Capture FPS includes image writes and pacing. It is not gameplay FPS.</p>
  </div>
  <ol class="challenge-steps">
    <li><span>01</span><div><h3>Set your challenge</h3><p>Choose your build, settings and resolution.</p></div></li>
    <li><span>02</span><div><h3>Run the demo</h3><p>Capture images, timings and optional GPU telemetry.</p></div></li>
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
