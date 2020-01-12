#!/bin/bash

PDIR=server/dist/modes/vue
DIR=server/dist/modes/vue/veturSnippets

# Create parent dir
if [ ! -d "$PDIR" ]; then
  mkdir -p "$PDIR"
fi

# Clean up if snippet DIR already exists
if [ -d "$DIR" ]; then
  rm -r "$DIR"
fi

cp -r server/src/modes/vue/veturSnippets server/dist/modes/vue/veturSnippets