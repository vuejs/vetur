#!/bin/bash

DIR=server/dist/modes/vue/veturSnippets

if [ -d "$DIR" ]; then
  rm -r "$DIR"
fi

cp -r server/src/modes/vue/veturSnippets server/dist/modes/vue/veturSnippets