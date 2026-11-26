# Doom 3 / Path Traced benchmark site

Static Jekyll site with a community GPU leaderboard. Engine sources are hosted
separately.

## Local preview

Requires Ruby 3.3+, Bundler, and Node 22+. No npm install is needed.

```sh
bundle install
npm test
npm run refresh
bundle exec jekyll serve --host 127.0.0.1
```

Open <http://127.0.0.1:4000>. Run `npm run refresh` again to fetch approved
submissions, rebuild the site, and check generated links.

## Deploy to GitHub Pages

To publish at **https://d3ptmark.github.io/**:

1. Use a GitHub account or organization named **d3ptmark**.
2. Host this site in **d3ptmark/d3ptmark.github.io**. If it is still under
   `aknavj`, transfer it through **Settings > General > Transfer ownership**.
3. Select **Settings > Pages > Source > GitHub Actions**. Do not set a custom domain.
4. Run **Actions > Build benchmark site > Run workflow**, or push to
   `main`, `master`, or `pt-refactor`.
5. Wait for both **build** and **deploy** to succeed.

The workflow handles the Pages base path automatically. A repository under
`aknavj` cannot claim the `d3ptmark.github.io` hostname.

After transferring, update your local remote:

```sh
git remote set-url origin git@github.com:d3ptmark/d3ptmark.github.io.git
```

## Configuration

Edit [_config.yml](./_config.yml):

- `url`: public site origin; currently `https://d3ptmark.github.io`.
- `source_repository` / `source_branch`: engine repository (`owner/repo`) and branch.
- `community_repository`: public submission repository, in `owner/repo` format.
- `youtube_intro_url` / `paypal_donate_url`: optional video and donation links.

Engine and submission repositories do not need to move with the site.

## Submissions and approval

- Use the site's **Run & submit** page to prepare an issue from benchmark files.
- Review the original archive, settings history, and preview before applying
  **`benchmark-approved`** in the submission repository.
- Removing the label removes the entry on the next refresh. Closing an issue
  does not approve it.
- Actions refreshes submissions hourly; a manual workflow run also refreshes them.
- Do not hand-edit generated leaderboard or report data.

Approval is manual review, not anti-cheat verification. Rankings compare only
matching workloads and settings, not general gameplay performance.

## Editing

- Pages: root Markdown files.
- Layout: [_layouts/default.html](./_layouts/default.html).
- Styles and browser code: [assets/](./assets/).
- Importer: [scripts/sync-submissions.mjs](./scripts/sync-submissions.mjs).
- Tests: `npm test`.

Never commit credentials, game archives, or private benchmark files.
