#!/usr/bin/env bash
# This script downloads the model files needed to run Yoha from the corresponding npm package.
TMP=$(mktemp -d)
cd $TMP
npm pack @handtracking.io/yoha
tar -xf *gz
cd -
mv $TMP/package/models .
