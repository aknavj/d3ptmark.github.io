---
title: Leaderboard
eyebrow: Community / Results
intro: "Community results, grouped by matching settings."
permalink: /leaderboard/
wide: true
---
Select a configuration to compare GPUs on the same workload. Results need
maintainer approval (`benchmark-approved`); this is community review, not
independent verification. Dirty or unknown revisions stay unranked.

<section id="leaderboard" data-source="{{ '/assets/data/leaderboard.json' | relative_url }}" data-report-url="{{ '/report/' | relative_url }}">
  <div class="leaderboard-filters">
    <label>Renderer <select id="leaderboard-model" disabled><option value="">All renderers</option><option value="PT_PHYSICAL">Physical PT</option><option value="legacy">Legacy PT</option><option value="OpenGL">OpenGL</option></select></label>
    <label>Preset <select id="leaderboard-preset" disabled><option value="">All presets</option><option value="low">low</option><option value="med">med</option><option value="high">high</option><option value="ultra">ultra</option><option value="custom">custom</option><option value="gameplay_low">gameplay_low</option><option value="gameplay_med">gameplay_med</option><option value="gameplay_high">gameplay_high</option><option value="gameplay_ultra">gameplay_ultra</option><option value="gameplay_custom">gameplay_custom</option><option value="cinematic_low">cinematic_low</option><option value="cinematic_med">cinematic_med</option><option value="cinematic_high">cinematic_high</option><option value="cinematic_ultra">cinematic_ultra</option><option value="cinematic_custom">cinematic_custom</option><option value="other">Other / not reported</option></select></label>
    <label>Platform <select id="leaderboard-platform" disabled><option value="">All platforms</option></select></label>
    <label>GPU, CPU or user <input id="leaderboard-search" type="search" placeholder="Search hardware..." disabled></label>
    <label>Sort by <select id="leaderboard-sort" disabled><option value="fps">Captured FPS</option><option value="gpu">GPU time</option><option value="date">Newest report</option></select></label>
  </div>
  <label>Comparison workload <select id="leaderboard-group" disabled><option>Loading results...</option></select></label>
  <p id="leaderboard-status" role="status" aria-live="polite"></p>
  <div id="leaderboard-results"></div>
  <div class="pagination"><button id="leaderboard-prev" class="secondary" disabled>Previous</button><span id="leaderboard-page"></span><button id="leaderboard-next" class="secondary" disabled>Next</button></div>
</section>

<noscript><p>Enable JavaScript for the table, or
<a href="{{ '/assets/data/leaderboard.json' | relative_url }}">read the JSON data</a>.</p></noscript>

**Captured fps counts fully converged frames.** Standard runs are uncapped without image
writes; capped (30 Hz) or image-saving runs are grouped separately and their fps includes that
overhead. GPU ms/frame is shown separately for PT and is unavailable for GL.
These are not gameplay FPS results.

[Run a benchmark and submit your GPU]({{ '/benchmark/' | relative_url }}).
