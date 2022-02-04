#!/usr/bin/env bash
cd $(dirname "$BASH_SOURCE")/..
yarn
yarn docs
./ci/ensure_clean_tree.sh
