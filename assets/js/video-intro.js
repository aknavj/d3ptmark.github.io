export function youtubeVideoId(value) {
  const invalid = () => { throw new Error("Set youtube_intro_url to a YouTube video URL or 11-character video ID."); };
  if (typeof value !== "string") return invalid();
  const input = value.trim(), idPattern = /^[A-Za-z0-9_-]{11}$/;
  if (idPattern.test(input)) return input;
  let url;
  try { url = new URL(input); } catch { return invalid(); }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return invalid();
  let id;
  if (url.hostname === "youtu.be") id = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  else if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) {
    if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) id = url.searchParams.get("v");
    else id = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
  }
  if (!id || !idPattern.test(id)) return invalid();
  return id;
}

if (typeof document !== "undefined") for (const section of document.querySelectorAll("[data-youtube-intro]")) {
  const screen = section.querySelector("[data-video-screen]");
  const button = section.querySelector("[data-video-load]");
  const watch = section.querySelector("[data-video-watch]");
  const status = section.querySelector("[data-video-status]");
  try {
    const id = youtubeVideoId(section.dataset.videoUrl);
    watch.href = `https://www.youtube.com/watch?v=${id}`;
    watch.hidden = false; screen.hidden = false;
    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.title = "Doom 3 path tracer introduction";
      iframe.allow = "encrypted-media; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1&rel=0`;
      screen.replaceChildren(iframe);
      section.classList.add("video-enabled");
      iframe.focus();
      status.textContent = "YouTube player requested. Use its controls to play, or watch on YouTube.";
    }, { once: true });
  } catch (error) {
    screen.hidden = true; watch.hidden = true;
    status.textContent = `Intro video unavailable: ${error.message}`;
  }
}
