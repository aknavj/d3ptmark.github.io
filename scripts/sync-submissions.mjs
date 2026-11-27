import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validateSubmission, safePreviewUrl, reportId } from "../assets/js/reports.js";

export function collectSubmissions(issues, repository, warn = console.warn) {
  const entries = [];
  for (const issue of issues) {
    if (issue.pull_request || !issue.labels?.some(label => label.name === "benchmark-approved")) continue;
    try {
      if (!Number.isSafeInteger(issue.number) || issue.number < 1) throw new Error("Invalid issue number.");
      const body = issue.body || "";
      const blocks = [...body.matchAll(/^```json[ \t]*\r?\n([\s\S]*?)^```[ \t]*$/gm)];
      if (blocks.length !== 1) throw new Error("Expected exactly one fenced JSON submission.");
      const report = validateSubmission(JSON.parse(blocks[0][1]));
      const author = issue.user?.login;
      if (typeof author !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(author)) {
        throw new Error("Invalid GitHub author.");
      }
      const attachments = body.replace(blocks[0][0], "");
      const markdownImage = attachments.match(/!\[[^\]\r\n]*\]\((https:\/\/[^\s)]+)\)/);
      const htmlImage = attachments.match(/<img\b[^>]*\bsrc="(https:\/\/[^"]+)"/i);
      const candidate = markdownImage?.[1] || htmlImage?.[1];
      const preview = safePreviewUrl(candidate);
      if (candidate && !preview) warn(`Issue #${issue.number}: preview omitted; use a public GitHub attachment URL without query parameters.`);
      entries.push({
        issue: `https://github.com/${repository}/issues/${issue.number}`,
        author, preview, report
      });
    } catch (error) {
      warn(`Issue #${issue.number}: rejected submission: ${JSON.stringify(error.message)}`);
    }
  }
  return entries.sort((a, b) => a.issue.localeCompare(b.issue, "en", { numeric: true }));
}

export async function fetchApproved(repository, token, fetcher = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error("Invalid community_repository in _config.yml.");
  const issues = [];
  for (let page = 1; page <= 20; page++) {
    const url = `https://api.github.com/repos/${repository}/issues?state=all&labels=benchmark-approved&per_page=100&page=${page}`;
    const response = await fetcher(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status} while reading approved submissions.`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Unexpected GitHub issues response.");
    issues.push(...batch);
    if (batch.length < 100) return issues;
  }
  throw new Error("Submission pagination exceeded 2,000 issues; increase the explicit limit before publishing.");
}

export async function writeReportFiles(entries, directory) {
  await mkdir(directory, { recursive: true });
  const filenames = new Set(), index = [];
  for (const entry of entries) {
    const name = `issue_${reportId(entry).split("/").at(-1)}.json`;
    if (filenames.has(name)) throw new Error("Duplicate report file.");
    filenames.add(name);
    const report = validateSubmission(entry.report);
    await writeFile(new URL(name, directory), JSON.stringify(report) + "\n");
    const { history, ...compact } = report;
    index.push({ ...entry, report: compact, details: `reports/${name}` });
  }
  for (const name of await readdir(directory)) {
    if (/^issue_[1-9]\d*\.json$/.test(name) && !filenames.has(name)) await unlink(new URL(name, directory));
  }
  return index;
}

async function main() {
  const config = await readFile(new URL("../_config.yml", import.meta.url), "utf8");
  const repository = config.match(/^community_repository:\s*([\w.-]+\/[\w.-]+)\s*$/m)?.[1];
  if (!repository) throw new Error("Set community_repository: owner/repo in _config.yml.");
  const issues = await fetchApproved(repository, process.env.GH_TOKEN);
  const entries = await writeReportFiles(collectSubmissions(issues, repository),
    new URL("../assets/data/reports/", import.meta.url));
  const dataDir = new URL("../_data/", import.meta.url);
  await mkdir(dataDir, { recursive: true });
  await writeFile(new URL("submissions.json", dataDir), JSON.stringify(entries, null, 2) + "\n");
  console.log(`Prepared ${entries.length} reviewed submissions from ${repository}. No attachments were downloaded.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
