#!/usr/bin/env bash

export CODE_TESTS_PATH="$(pwd)/dist/test"
export CODE_TESTS_WORKSPACE="$(pwd)/test/fixture"

CODE_ROOT=$(pwd)

if [ ! -d "$(pwd)/test/fixture/node_modules" ]; then
  cd $CODE_TESTS_WORKSPACE
  yarn install
  cd $CODE_ROOT
fi

node "$(pwd)/node_modules/vscode/bin/test"
