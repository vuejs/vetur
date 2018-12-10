/**
 * Dynamically generate grammar
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Available grammar scopes
const SCOPES: { [lang: string]: string } = {
  html: 'text.html.basic',
  pug: 'text.pug',
  haml: 'text.haml',
  css: 'source.css',
  scss: 'source.css.scss',
  less: 'source.css.less',
  postcss: 'source.css.postcss',
  sass: 'source.sass',
  stylus: 'source.stylus',
  js: 'source.js',
  ts: 'source.ts',
  coffee: 'source.coffee',
  md: 'text.html.markdown',
  yaml: 'source.yaml',
  json: 'source.json',
  php: 'source.php'
};

export function generateGrammarCommandHandler(extensionPath: string) {
  const customBlocks: { [k: string]: string } =
    vscode.workspace.getConfiguration().get('vetur.grammar.customBlocks') || {};

  return () => {
    try {
      const generatedGrammar = getGeneratedGrammar(
        path.resolve(extensionPath, 'syntaxes/vue.json'),
        customBlocks
      );
      fs.writeFileSync(path.resolve(extensionPath, 'syntaxes/vue-generated.json'), generatedGrammar, 'utf-8');
      vscode.window.showInformationMessage('Successfully generated vue grammar. Reload VS Code to enable it.');
    } catch (e) {
      vscode.window.showErrorMessage(
        'Failed to generate vue grammar. `vetur.grammar.customBlocks` contain invalid language values'
      );
    }
  };
}

function getGeneratedGrammar(grammarPath: string, customBlocks: { [k: string]: string }): string {
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf-8'));
  for (const tag in customBlocks) {
    const lang = customBlocks[tag];
    if (!SCOPES[lang]) {
      throw `The language for custom block <${tag}> is invalid`;
    }

    grammar.patterns.push(makePattern(tag, SCOPES[lang]));
  }
  return JSON.stringify(grammar, null, 2);
}

function makePattern(tag: string, scope: string) {
  return JSON.parse(`
  {
    "begin": "(<)(${tag})",
    "beginCaptures": {
        "1": {
            "name": "punctuation.definition.tag.begin.html"
        },
        "2": {
            "name": "entity.name.tag.style.html"
        }
    },
    "end": "(</)(${tag})(>)",
    "endCaptures": {
        "1": {
            "name": "punctuation.definition.tag.begin.html"
        },
        "2": {
            "name": "entity.name.tag.style.html"
        },
        "3": {
            "name": "punctuation.definition.tag.end.html"
        }
    },
    "patterns": [
        {
            "include": "#tag-stuff"
        },
        {
            "begin": "(>)",
            "beginCaptures": {
                "1": {
                    "name": "punctuation.definition.tag.end.html"
                }
            },
            "end": "(?=</${tag}>)",
            "contentName": "${scope}",
            "patterns": [
                {
                    "include": "${scope}"
                }
            ]
        }
    ]
  }
  `);
}
