#!/usr/bin/env bash
set -euo pipefail

# init_repo_structure.sh
# Reads repo-tree.txt (format: lines starting with 'D ' for directories
# and 'F ' for files) and creates empty directories and files accordingly.
# Usage: ./scripts/init_repo_structure.sh repo-tree.txt

TREE_FILE=${1:-repo-tree.txt}

if [ ! -f "$TREE_FILE" ]; then
  echo "Repo tree file not found: $TREE_FILE" >&2
  exit 2
fi

echo "Creating directories and files from $TREE_FILE"

while IFS= read -r line; do
  # skip empty lines
  [[ -z "$line" ]] && continue
  prefix=${line:0:2}
  path=${line:2}
  case "$prefix" in
    "D ")
      mkdir -p "$path"
      ;;
    "F ")
      dir=$(dirname "$path")
      if [ "$dir" != "." ]; then
        mkdir -p "$dir"
      fi
      # create file if not exists
      if [ ! -f "$path" ]; then
        touch "$path"
      fi
      ;;
    *)
      echo "Ignoring unrecognized line: $line" >&2
      ;;
  esac
done < "$TREE_FILE"

echo "Repository skeleton created/verified from $TREE_FILE"
