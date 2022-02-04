#!/usr/bin/env bash

# Check for new files.
if [[ -z $(git ls-files --exclude-standard --others) ]]; then
  exit 1;
fi

# Check for modified files.
if [[ -z $(git diff-files --quiet) ]]; then
  exit 1;
fi
