import type { TextDocument } from 'vscode-languageserver-textdocument';
import { createScanner, HtmlTokenType, Scanner } from '../modes/template/parser/htmlScanner';
import { removeQuotes } from '../utils/strings';
import { LanguageId } from './embeddedSupport';

export type RegionType = 'template' | 'script' | 'style' | 'custom';
export type RegionAttrKey = 'setup' | 'module' | 'scoped' | 'lang';

export type RegionAttrs = Partial<Record<RegionAttrKey, boolean | string>> & Partial<Record<string, boolean | string>>;

export interface EmbeddedRegion {
  languageId: LanguageId;
  start: number;
  end: number;
  type: RegionType;
  attrs: RegionAttrs;
}

const defaultScriptLang = 'javascript';
const defaultCSSLang = 'css';

export function parseVueDocumentRegions(document: TextDocument) {
  const regions: EmbeddedRegion[] = [];
  const text = document.getText();
  const scanner = createScanner(text);
  let lastTagName = '';
  let lastAttributeName = '';
  let languageIdFromType: LanguageId | '' = '';
  let attrs: Partial<Record<string, boolean | string>> = {};
  const importedScripts: string[] = [];
  let stakes = 0;

  let token = scanner.scan();
  while (token !== HtmlTokenType.EOS) {
    switch (token) {
      case HtmlTokenType.Styles:
        regions.push({
          languageId: /^(sass|scss|less|postcss|stylus)$/.test(languageIdFromType)
            ? (languageIdFromType as LanguageId)
            : defaultCSSLang,
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
          type: 'style',
          attrs
        });
        languageIdFromType = '';
        break;
      case HtmlTokenType.Script:
        regions.push({
          languageId: languageIdFromType ? languageIdFromType : defaultScriptLang,
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
          type: 'script',
          attrs
        });
        languageIdFromType = '';
        break;
      case HtmlTokenType.StartTag:
        stakes++;
        const tagName = scanner.getTokenText();
        if (tagName === 'template' && stakes === 1) {
          const templateRegion = scanTemplateRegion(scanner, text);
          if (templateRegion) {
            regions.push(templateRegion);
          }
        } else if (!['style', 'script'].includes(tagName) && stakes === 1) {
          const customRegion = scanCustomRegion(tagName, scanner, text);
          if (customRegion) {
            regions.push(customRegion);
          }
        }
        lastTagName = tagName;
        lastAttributeName = '';
        break;
      case HtmlTokenType.AttributeName:
        lastAttributeName = scanner.getTokenText();
        attrs[lastAttributeName] = true;
        break;
      case HtmlTokenType.AttributeValue:
        const attrValue = removeQuotes(scanner.getTokenText());
        if (lastAttributeName === 'lang') {
          languageIdFromType = getLanguageIdFromLangAttr(attrValue);
        } else {
          if (lastAttributeName === 'src' && lastTagName.toLowerCase() === 'script') {
            const value = attrValue;
            importedScripts.push(value);
          }
        }
        attrs[lastAttributeName] = attrValue;
        lastAttributeName = '';
        break;
      case HtmlTokenType.StartTagSelfClose:
      case HtmlTokenType.EndTagClose:
        attrs = {};
        stakes--;
        lastAttributeName = '';
        languageIdFromType = '';
        break;
    }
    token = scanner.scan();
  }

  return {
    regions,
    importedScripts
  };
}

function scanTemplateRegion(scanner: Scanner, text: string): EmbeddedRegion | null {
  let languageId: LanguageId = 'vue-html';

  let token = -1;
  let start = 0;
  let end: number;
  const attrs: Partial<Record<string, boolean | string>> = {};

  // Scan until finding matching template EndTag
  // Also record immediate next StartTagClose to find start
  let unClosedTemplate = 1;
  let lastAttributeName = null;
  while (unClosedTemplate !== 0) {
    // skip parsing on non html syntax, just search terminator
    if (token === HtmlTokenType.AttributeValue && languageId !== 'vue-html') {
      while (![HtmlTokenType.StartTagClose, HtmlTokenType.StartTagSelfClose].includes(token)) {
        token = scanner.scan();
      }
      start = scanner.getTokenEnd();

      token = scanner.scanForRegexp(/<\/template>/);
      if (token === HtmlTokenType.EOS) {
        return null;
      }

      // scan to `EndTag`, past `</` to `template`
      while (token !== HtmlTokenType.EndTag) {
        token = scanner.scan();
      }
      break;
    }

    token = scanner.scan();

    if (token === HtmlTokenType.EOS) {
      return null;
    }

    if (start === 0) {
      if (token === HtmlTokenType.AttributeName) {
        lastAttributeName = scanner.getTokenText();
        attrs[lastAttributeName] = true;
      } else if (token === HtmlTokenType.AttributeValue) {
        const attrValue = removeQuotes(scanner.getTokenText());
        if (lastAttributeName === 'lang') {
          languageId = getLanguageIdFromLangAttr(attrValue);
        }
        if (lastAttributeName) {
          attrs[lastAttributeName] = attrValue;
        }
        lastAttributeName = null;
      } else if (token === HtmlTokenType.StartTagClose) {
        start = scanner.getTokenEnd();
      }
    } else {
      if (token === HtmlTokenType.StartTag && scanner.getTokenText() === 'template') {
        unClosedTemplate++;
      } else if (token === HtmlTokenType.EndTag && scanner.getTokenText() === 'template') {
        unClosedTemplate--;
        // test leading </template>
        const charPosBeforeEndTag = scanner.getTokenOffset() - 3;
        if (text[charPosBeforeEndTag] === '\n') {
          break;
        }
      } else if (token === HtmlTokenType.Unknown) {
        if (scanner.getTokenText().charAt(0) === '<') {
          const offset = scanner.getTokenOffset();
          const unknownText = text.slice(offset, offset + 11);
          if (unknownText === '</template>') {
            unClosedTemplate--;
            // test leading </template>
            if (text[offset - 1] === '\n') {
              return {
                languageId,
                start,
                end: offset,
                type: 'template',
                attrs
              };
            }
          }
        }
      }
    }
  }

  // In EndTag, find end
  // -2 for </
  end = scanner.getTokenOffset() - 2;

  return {
    languageId,
    start,
    end,
    type: 'template',
    attrs
  };
}

function scanCustomRegion(tagName: string, scanner: Scanner, text: string): EmbeddedRegion | null {
  let languageId: LanguageId = 'unknown';

  let token = -1;
  let start = 0;
  let end: number;
  const attrs: Partial<Record<string, boolean | string>> = {};

  // Scan until finding matching template EndTag
  // Also record immediate next StartTagClose to find start
  let unClosedTag = 1;
  let lastAttributeName: string | null = null;
  while (unClosedTag !== 0) {
    token = scanner.scan();

    if (token === HtmlTokenType.EOS) {
      return null;
    }

    if (start === 0) {
      if (token === HtmlTokenType.AttributeName) {
        lastAttributeName = scanner.getTokenText();
        attrs[lastAttributeName] = true;
      } else if (token === HtmlTokenType.AttributeValue) {
        const attrValue = removeQuotes(scanner.getTokenText());
        if (lastAttributeName === 'lang') {
          languageId = getLanguageIdFromLangAttr(attrValue);
        }
        if (lastAttributeName) {
          attrs[lastAttributeName] = attrValue;
        }
        lastAttributeName = null;
      } else if (token === HtmlTokenType.StartTagClose) {
        start = scanner.getTokenEnd();
      }
    } else {
      if (token === HtmlTokenType.StartTag && scanner.getTokenText() === tagName) {
        unClosedTag++;
      } else if (token === HtmlTokenType.EndTag && scanner.getTokenText() === tagName) {
        unClosedTag--;
        // test leading </${tagName}>
        const charPosBeforeEndTag = scanner.getTokenOffset() - 3;
        if (text[charPosBeforeEndTag] === '\n') {
          break;
        }
      } else if (token === HtmlTokenType.Unknown) {
        if (scanner.getTokenText().charAt(0) === '<') {
          const offset = scanner.getTokenOffset();
          const unknownText = text.slice(offset, offset + `</${tagName}>`.length);
          if (unknownText === `</${tagName}>`) {
            unClosedTag--;
            // test leading </${tagName}>
            if (text[offset - 1] === '\n') {
              return {
                languageId,
                start,
                end: offset,
                type: 'custom',
                attrs
              };
            }
          }
        }
      }
    }
  }

  // In EndTag, find end
  // -2 for </
  end = scanner.getTokenOffset() - 2;

  return {
    languageId,
    start,
    end,
    type: 'custom',
    attrs
  };
}

function getLanguageIdFromLangAttr(languageIdFromType: string): LanguageId {
  if (languageIdFromType === 'jade') {
    languageIdFromType = 'pug';
  }
  if (languageIdFromType === 'ts') {
    languageIdFromType = 'typescript';
  }
  return languageIdFromType as LanguageId;
}
