#!/usr/bin/env bash
# Pushes the full site (pages, API, admin panel) to GitHub in one go.
#
# This replaces the drag-and-drop uploads. GitHub's web uploader caps you at 100
# files and quietly flattens paths when you drag the wrong folder, which is what
# put a "css" folder at the root of the repo instead of leaving it inside
# "assets". Git does not have either problem: no file limit, and paths are
# exactly what is on disk.
#
# It clones the repo, replaces its contents with the build, and pushes. History
# is kept, so nothing is destroyed and you can roll back from GitHub if needed.
#
# Usage:
#   chmod +x push-site-to-github.sh
#   ./push-site-to-github.sh https://github.com/YOUR-USER/YOUR-REPO.git
#
# Optionally pass the zip and the branch:
#   ./push-site-to-github.sh <repo-url> footscray-dental-studio-deploy.zip main
#
# Content edited in the dashboard lives in the database, not in the repo, so a push never
# overwrites the practice's edits. The JSON in content/ is only the fallback the build
# uses when the database is unreachable.

set -euo pipefail

REPO_URL="${1:-}"
ZIP="${2:-footscray-dental-studio-deploy.zip}"
BRANCH="${3:-}"   # empty means "whatever the repo's default branch is"

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./push-site-to-github.sh <repo-url> [deploy.zip] [branch]" >&2
  echo "Example: ./push-site-to-github.sh https://github.com/me/footscray-site.git" >&2
  exit 2
fi
if [ ! -f "$ZIP" ]; then
  echo "Cannot find $ZIP in $(pwd)." >&2
  echo "Put the full deploy zip beside this script, or pass its path as the second argument." >&2
  exit 2
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "1/6  Unpacking $ZIP"
mkdir -p "$WORK/site"
unzip -q "$ZIP" -d "$WORK/site"
# strip macOS extras that the Finder adds when zipping or unzipping
find "$WORK/site" \( -name '.DS_Store' -o -name '._*' \) -delete 2>/dev/null || true
rm -rf "$WORK/site/__MACOSX"
FILES=$(find "$WORK/site" -type f | wc -l | tr -d ' ')
echo "     $FILES files"

if [ ! -f "$WORK/site/package.json" ] || [ ! -f "$WORK/site/payload.config.ts" ] || [ ! -f "$WORK/site/site/index.html" ]; then
  echo "     The unpacked build does not look right." >&2
  echo "     Expected package.json, payload.config.ts and site/index.html at the top level." >&2
  exit 1
fi
echo "     package.json, payload.config.ts and site/ are where they should be"

echo "2/6  Cloning $REPO_URL"
git clone --quiet "$REPO_URL" "$WORK/repo"
cd "$WORK/repo"

# Push to the branch the repo actually serves. Guessing "main" would silently
# put the site on a branch nothing deploys from.
if [ -z "$BRANCH" ]; then
  BRANCH="$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)"
  [ -z "$BRANCH" ] && BRANCH="$(git remote show origin 2>/dev/null \
      | sed -n 's/.*HEAD branch: //p' | head -1)"
  [ -z "$BRANCH" ] && BRANCH="main"
fi
echo "     default branch: $BRANCH"
git checkout --quiet "$BRANCH" 2>/dev/null || git checkout --quiet -b "$BRANCH"

echo "3/6  Clearing the old files (git history is kept)"
# Delete everything the repo tracks, so stray folders from the manual uploads go
# too. .git is untouched.
find . -mindepth 1 -maxdepth 1 \
     ! -name '.git' \
     -exec rm -rf {} +

echo "4/6  Copying the build in"
cp -R "$WORK/site/." .

echo "5/6  Committing"
# the build ships its own .gitignore (.env, media/, .next/, public/); add the macOS extras
printf '\n# macOS\n.DS_Store\n._*\n__MACOSX/\nThumbs.db\n' >> .gitignore
git add -A
if git diff --cached --quiet; then
  echo "     Nothing changed, the repo already matches the build."
  exit 0
fi
git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo 'Site Deploy')}" \
    -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo 'deploy@example.com')}" \
    commit --quiet -m "Deploy full site build ($FILES files, correct asset paths)"

echo "6/6  Pushing to $BRANCH"
git push --quiet origin "$BRANCH"

# Prove the push landed by re-reading the branch from the server, not from the
# local tracking ref, which can still be pointing at the old commit.
git fetch --quiet origin "$BRANCH"
REMOTE_TREE="$(git ls-tree -r --name-only FETCH_HEAD)"
PUSHED="$(printf '%s\n' "$REMOTE_TREE" | grep -c . || true)"
echo
if [ "$PUSHED" -lt 100 ]; then
  echo "Push reported success but the remote branch holds only $PUSHED files." >&2
  echo "Check the branch name on GitHub and rerun with it as the third argument." >&2
  exit 1
fi
for must in package.json payload.config.ts next.config.mjs site/index.html site/assets/css/styles.css app/api/contact/route.ts content/site.json content/schema.json migrations/index.ts; do
  printf '%s\n' "$REMOTE_TREE" | grep -qx "$must" \
    || { echo "Missing on the remote after push: $must" >&2; exit 1; }
done
echo "Verified on the server: $PUSHED files, correct asset paths, no stray root folders."
echo
echo "Done. Pushed $FILES files."
echo
echo "Check on GitHub that the repo root now has:"
echo "  app/  build/  cms/  content/  lib/  migrations/  scripts/  site/  package.json  payload.config.ts"
echo
echo "Vercel builds on every push. Then confirm:"
echo "  https://<your-site>/                        the site, unchanged"
echo "  https://<your-site>/admin/                  the dashboard sign-in"
