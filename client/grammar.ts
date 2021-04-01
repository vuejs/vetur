/**
 * Dynamically generate grammar
 */
import { readFileSync } from 'fs';

// Available grammar scopes
const SCOPES: { [lang: string]: string } = {
  html: 'text.html.basic',
  pug: 'text.pug',
  haml: 'text.haml',
  slim: 'text.slim',
  css: 'source.css',
  scss: 'source.css.scss',
  less: 'source.css.less',
  postcss: 'source.css.postcss',
  sss: 'source.css.sugarss',
  sass: 'source.sass',
  stylus: 'source.stylus',
  js: 'source.js',
  ts: 'source.ts',
  coffee: 'source.coffee',
  md: 'text.html.markdown',
  yaml: 'source.yaml',
  json: 'source.json',
  php: 'source.php',
  graphql: 'source.graphql',
  liquid: 'text.html.liquid',
  xml: 'text.xml'
};

export function getGeneratedGrammar(grammarPath: string, customBlocks: { [k: string]: string }): string {
  const grammar = JSON.parse(readFileSync(grammarPath, 'utf-8'));
  for (const tag in customBlocks) {
    const lang = customBlocks[tag];
    if (!SCOPES[lang]) {
      throw `The language for custom block <${tag}> is invalid`;
    }

    grammar.patterns.unshift(makePattern(tag, SCOPES[lang]));
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
