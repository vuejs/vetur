#!/usr/bin/env -S-P${PATH}:/usr/local/bin:/usr/bin bash

# FIXME: Stop hardcoding this once the document symbols API is fixed.
export CODE_VERSION="1.27.2"
export CODE_TESTS_PATH="$(pwd)/dist/test"
export CODE_TESTS_WORKSPACE="$(pwd)/test/fixture"

CODE_ROOT=$(pwd)

if [ ! -d "$(pwd)/test/fixture/node_modules" ]; then
  cd $CODE_TESTS_WORKSPACE
  yarn install
  cd $CODE_ROOT
fi

node "$(pwd)/node_modules/vscode/bin/test"
