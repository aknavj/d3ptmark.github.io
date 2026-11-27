// Three images (OpenGL / d3ptmark-le / d3ptmark-pt) in one view, split by two lines.
// Split positions are percentages of the image width; line "a" stays left of line "b".

export const SPLIT_GAP = 2;	// minimum distance between the lines, in percent

// the line a pointer at position p (percent) grabs: the nearer one, and on a tie
// (lines on top of each other) the one on the pointer's side
export function pickSplit(split, p) {
  const da = Math.abs(p - split.a), db = Math.abs(p - split.b);
  if (da !== db) return da < db ? "a" : "b";
  return p <= split.a ? "a" : "b";
}

// moves one line to value (percent), keeping both inside the image and in order
export function moveSplit(split, key, value) {
  const v = Number.isFinite(value) ? value : split[key];
  if (key === "a") return { a: Math.min(Math.max(v, 0), split.b - SPLIT_GAP), b: split.b };
  return { a: split.a, b: Math.max(Math.min(v, 100), split.a + SPLIT_GAP) };
}

if (typeof document !== "undefined") for (const figure of document.querySelectorAll("[data-tri-compare]")) {
  const lines = { a: figure.querySelector('[data-split="a"]'), b: figure.querySelector('[data-split="b"]') };
  let split = { a: 100 / 3, b: 200 / 3 }, active = null;
  const apply = () => {
    figure.style.setProperty("--split-a", `${split.a}%`);
    figure.style.setProperty("--split-b", `${split.b}%`);
    for (const key of ["a", "b"]) lines[key].setAttribute("aria-valuenow", String(Math.round(split[key])));
  };
  const percent = event => {
    const box = figure.getBoundingClientRect();
    return (event.clientX - box.left) / box.width * 100;
  };
  figure.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    const p = percent(event);
    active = pickSplit(split, p);
    figure.setPointerCapture(event.pointerId);
    split = moveSplit(split, active, p); apply();
  });
  figure.addEventListener("pointermove", event => {
    if (active) { split = moveSplit(split, active, percent(event)); apply(); }
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) figure.addEventListener(type, () => { active = null; });
  for (const key of ["a", "b"]) lines[key].addEventListener("keydown", event => {
    const step = event.shiftKey ? 10 : 2;
    const target = { ArrowLeft: split[key] - step, ArrowDown: split[key] - step, ArrowRight: split[key] + step,
      ArrowUp: split[key] + step, Home: 0, End: 100 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    split = moveSplit(split, key, target); apply();
  });
  figure.classList.add("interactive");
  apply();
}
