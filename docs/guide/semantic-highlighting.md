# Semantic Highlighting

https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide

Vetur supports semantic highlighting for the following languages:
- TypeScript
- JavaScript

## Ref in composition API

The `.value` will get `property.refValue`.
Vetur will automatic underline `.value`. You can set `{ "vetur.underline.refValue": false }` to close it in vscode setting.

And use this setting for customize style.
```json
{
  "editor.semanticTokenColorCustomizations": {
    "enabled": true,
    "rules": {
      "property.refValue": {
        "underline": true
      }
    }
  }
}
```
