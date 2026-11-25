import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function refresh(args = [], failure = "") {
  const root = await mkdtemp(join(tmpdir(), "doom3-site-refresh-test-"));
  try {
    await mkdir(join(root, "scripts"));
    await mkdir(join(root, "bin"));
    await copyFile(new URL("../scripts/refresh-site.sh", import.meta.url), join(root, "scripts/refresh-site.sh"));
    for (const command of ["npm", "bundle", "node"]) {
      await writeFile(join(root, "bin", command), `#!/bin/sh
printf '%s\\n' '${command}' "$PWD" "$@" >> "$REFRESH_LOG"
if [ "$REFRESH_FAILURE" = '${command}' ]; then exit 7; fi
`, { mode: 0o755 });
    }
    const log = join(root, "commands.log");
    const result = spawnSync("sh", [join(root, "scripts/refresh-site.sh"), ...args], {
      cwd: tmpdir(), encoding: "utf8",
      env: { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}`,
        REFRESH_LOG: log, REFRESH_FAILURE: failure }
    });
    assert.ifError(result.error);
    const commands = args.length > 2 ? "" : await readFile(log, "utf8");
    return { root, result, commands };
  } finally {
    await rm(root, { recursive: true });
  }
}

test("refresh imports, builds and checks from the site root with default paths", async () => {
  const { root, result, commands } = await refresh();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(commands, [
    "npm", root, "run", "sync",
    "bundle", root, "exec", "jekyll", "build", "--strict_front_matter",
    "--baseurl", "", "--destination", "_site",
    "node", root, "scripts/check-site.mjs", "_site", "", ""
  ].join("\n"));
});

test("refresh preserves project baseurls and destinations containing spaces", async () => {
  const { result, commands } = await refresh(["/doom3-benchmark", "preview output"]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(commands.includes("--baseurl\n/doom3-benchmark\n--destination\npreview output\n"));
  assert.ok(commands.endsWith("scripts/check-site.mjs\npreview output\n/doom3-benchmark\n"));
});

for (const failure of ["npm", "bundle", "node"]) {
  test(`refresh propagates ${failure} failures and stops subsequent steps`, async () => {
    const { result, commands } = await refresh([], failure);
    assert.equal(result.status, 7);
    if (failure === "npm") assert.doesNotMatch(commands, /^bundle$/m);
    if (failure !== "node") assert.doesNotMatch(commands, /^node$/m);
  });
}

test("refresh rejects extra arguments before running commands", async () => {
  const { result, commands } = await refresh(["a", "b", "c"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
  assert.equal(commands, "");
});
