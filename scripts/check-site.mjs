import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.argv[2] || "_site");
const base = (process.argv[3] || "").replace(/\/$/, "");
let count = 0;
const errors = [];
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (extname(path) === ".html") {
      count++;
      const html = await readFile(path, "utf8");
      if (!/<html lang="en">/.test(html) || !/<title>[^<]+<\/title>/.test(html)) errors.push(`${path}: missing document metadata`);
      for (const match of html.matchAll(/\b(?:src|href|data-source)="([^"]+)"/g)) {
        const url = match[1];
        if (!url.startsWith("/") || url.startsWith("//")) continue;
        if (base && url !== base && !url.startsWith(base + "/")) {
          errors.push(`${path}: link ignores project baseurl: ${url}`); continue;
        }
        const relative = decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]);
        let target = resolve(root, "." + relative);
        if (target !== root && !target.startsWith(root + sep)) { errors.push(`${path}: escaping link: ${url}`); continue; }
        try {
          if ((await stat(target)).isDirectory()) target = resolve(target, "index.html");
          await stat(target);
        } catch { errors.push(`${path}: missing local target: ${url}`); }
      }
    }
  }
}
await walk(root);
if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
else console.log(`PASS: ${count} HTML documents; local links, image sources and baseurl targets exist.`);
