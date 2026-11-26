# Doom 3 / Path Traced benchmark site

Static Jekyll site at **https://d3ptmark.github.io/**.

## Deployment

Host the repository at **d3ptmark/d3ptmark.github.io** and select
**Settings > Pages > Source > GitHub Actions**. No custom domain is needed.

Push to `main`, `master`, or `pt-refactor`, or manually run
**Actions > Build benchmark site**.

Actions fetches issues labeled **benchmark-approved** from `community_repository`
and generates the leaderboard and reports before building. Generated submission
data is not committed. Review the archive, settings, and preview before approval.
An hourly workflow refreshes the site; removing approval removes the entry on
the next refresh.

## Configuration

Edit [_config.yml](./_config.yml) for the site URL, engine repository and branch,
submission repository (`owner/repo`), video, and donation link.

## Local preview

Requires Ruby 3.3+, Bundler, and Node 22+.

```sh
bundle install
npm run sync
bundle exec jekyll serve --host 127.0.0.1
```

Open <http://127.0.0.1:4000>. Skip `npm run sync` for an empty leaderboard.
Tests and scripts are excluded from the published site.
