import test from "node:test";
import assert from "node:assert/strict";
import { youtubeVideoId } from "../assets/js/video-intro.js";

const id = "M7lc1UVf-VE";
for (const value of [
  id, ` https://youtu.be/${id}?si=share-token `,
  `https://www.youtube.com/watch?v=${id}&feature=shared`,
  `https://youtube.com/watch?list=playlist&v=${id}`,
  `https://m.youtube.com/watch?v=${id}`, `https://www.youtube.com/embed/${id}`,
  `https://youtube.com/shorts/${id}`, `https://youtube.com/live/${id}/`
]) test(`accepts a supported YouTube video: ${value}`, () => assert.equal(youtubeVideoId(value), id));

for (const value of [
  "", null, 123, "too-short", "abcdefghijk;", `http://youtu.be/${id}`,
  `https://youtube.com.evil.test/watch?v=${id}`, `https://evil.test/${id}`,
  `https://youtu.be.evil.test/${id}`, `https://youtube.com@evil.test/watch?v=${id}`,
  `https://name@youtube.com/watch?v=${id}`, `https://youtube.com:444/watch?v=${id}`,
  `https://www.youtube.com/watch?v=${id}&v=abcdefghijk`,
  `https://youtu.be/${id}/extra`, "javascript:alert(1)", "//youtube.com/watch?v=abcdefghijk",
  "https://youtube.com/watch?list=playlist", 'https://youtu.be/abc"><script'
]) test(`rejects invalid or non-YouTube intro values: ${JSON.stringify(value)}`, () => {
  assert.throws(() => youtubeVideoId(value), /youtube_intro_url/);
});
