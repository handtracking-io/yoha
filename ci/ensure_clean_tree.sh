#!/usr/bin/env bash

cd $(dirname "$BASH_SOURCE")/..

# Check for new files.
if [[ "$(git ls-files --exclude-standard --others)" ]]; then
  echo "Error: Code and docs are out of sync. Printing output of 'git status' for reference." 1>&2
  git status
  exit 1
fi

# Check for modified files.
if [[ $(git diff-files) ]]; then
  echo "Error: Code and docs are out of sync. Printing output of 'git status' for reference." 1>&2
  git status
  exit 1
fi
