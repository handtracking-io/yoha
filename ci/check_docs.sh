#!/usr/bin/env bash
# This script checks whether the source code is in sync with the auto generated documentation.
cd $(dirname "$BASH_SOURCE")/..
yarn
yarn docs
./ci/check_git_clean.sh
