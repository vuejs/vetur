import {CompletionList, CompletionItemKind, InsertTextFormat, CompletionItem} from 'vscode-languageserver-types';

export function doScaffoldComplete(): CompletionList {
  const topLevelCompletions: CompletionItem[] = [
    {
      label: 'scaffold',
      documentation: 'Scaffold <template>, <script> and <style>',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<template>
  \${0}
</template>

<script>
export default {

}
</script>

<style>
  \${0}
</style>
`
    },
    {
      label: 'template with html',
      documentation: 'Scaffold <template> with html',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<template>
  \${0}
</template>
`
    },
    {
      label: 'template with pug',
      documentation: 'Scaffold <template> with pug',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<template lang="pug">
  \${0}
</template>
`
    },
    {
      label: 'script with JavaScript',
      documentation: 'Scaffold <script> with JavaScript',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<script>
export default {
  \${0}
}
</script>
`
    },
    {
      label: 'script with TypeScript',
      documentation: 'Scaffold <script> with TypeScript',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<script lang="ts">
export default {
  \${0}
}
</script>
`
    },
    {
      label: 'style with CSS',
      documentation: 'Scaffold <style> with CSS',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<style>
\${0}
</style>
`
    },
    {
      label: 'style with scss',
      documentation: 'Scaffold <style> with scss',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<style lang="scss">
\${0}
</style>
`
    },
    {
      label: 'style with less',
      documentation: 'Scaffold <style> with less',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<style lang="less">
\${0}
</style>
`
    },
    {
      label: 'style with sass',
      documentation: 'Scaffold <style> with sass',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<style lang="sass">
\${0}
</style>
`
    },
    {
      label: 'style with postcss',
      documentation: 'Scaffold <style> with postcss',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<style lang="postcss">
\${0}
</style>
`
    },
    {
      label: 'style with stylus',
      documentation: 'Scaffold <style> with stylus',
      kind: CompletionItemKind.Snippet,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText:
`<style lang="stylus">
\${0}
</style>
`
    },
  ];

  return {
    isIncomplete: false,
    items: topLevelCompletions
  };
}
