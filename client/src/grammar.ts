/**
 * Dynamically generate grammar
 */

import * as fs from 'fs';

// Available grammar scopes
const SCOPES = {
  html: 'text.html.basic',
  jade: 'text.jade',
  pug: 'text.pug',
  css: 'source.css',
  scss: 'source.css.scss',
  less: 'source.css.less',
  postcss: 'source.css.postcss',
  sass: 'source.sass',
  stylus: 'source.stylus',
  javascript: 'source.js',
  js: 'source.js',
  typescript: 'source.ts',
  ts: 'source.ts',
  coffeescript: 'source.coffee',
  coffee: 'source.coffee',
  md: 'text.html.markdown',
  markdown: 'text.html.markdown',
  yaml: 'source.yaml',
  json: 'source.json',
  php: 'source.php'
};

export function getGeneratedGrammar(grammarPath: string, customBlocks: { [k: string]: string }): string {
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
            "end": "(?=</${tag}>)", 
            "contentName": "${scope}", 
            "patterns": [
                {
                    "include": "${scope}"
                }
            ]
        }
    ], 
    "beginCaptures": {
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
    "end": "(</)(${tag})(>)", 
    "begin": "(<)(${tag})(>)", 
    "contentName": "${scope}.embedded.vue"
  }
  `);
}
