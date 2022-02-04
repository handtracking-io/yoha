#!/usr/bin/env bash
cd ..
yarn
yarn docs
cd -
./ensure_clean_tree.sh
