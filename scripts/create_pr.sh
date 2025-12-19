#!/usr/bin/env bash
set -euo pipefail

BRANCH=${1:-feature/ci-node-python}
FILES=${2:-".github/workflows/ci.yml .github/workflows/node-tests.yml"}
TITLE=${3:-"CI: add Node matrix + Python tests"}
BODY=${4:-"Adds CI workflows: Node Jest matrix with npm cache and Python pytest with pip cache."}

git checkout -b "$BRANCH"
git add $FILES
git commit -m "$TITLE"
git push --set-upstream origin "$BRANCH"

if command -v gh >/dev/null 2>&1; then
  gh pr create --title "$TITLE" --body "$BODY" --base main
else
  echo "gh CLI not found. Create PR manually or install gh: https://cli.github.com/"
fi

exit 0
