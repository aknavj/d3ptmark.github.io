---
title: Image comparisons
eyebrow: Image lab / Comparisons
intro: "Real captures from development builds."
permalink: /comparisons/
---
Drag the denoiser sliders or use the arrow keys. The GL/PT pair stays side by
side because its camera settings differ.

{% for pair in site.data.gallery %}
{% include comparison.html pair=pair %}
{% endfor %}

Lossless images, without retouching. Older captures may differ from current builds.

## Capture your own

Use the same demo and frame, equal resolution, `r_ptRenderScale 1`, and matching
camera FOV. Disable physical DOF for a pinhole comparison; check exposure too.

[Run the GL/PT capture workflow]({{ '/benchmark/' | relative_url }}).
