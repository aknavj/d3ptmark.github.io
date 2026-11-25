#!/bin/sh
set -eu

if [ "$#" -gt 2 ]; then
  echo "Usage: npm run refresh -- [baseurl] [destination]" >&2
  exit 1
fi

cd "$(dirname "$0")/.."
baseurl=${1:-}
destination=${2:-_site}

npm run sync
bundle exec jekyll build --strict_front_matter --baseurl "$baseurl" --destination "$destination"
node scripts/check-site.mjs "$destination" "$baseurl"
