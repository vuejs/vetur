import { removeQuotes } from '../utils/strings';
import { Scanner, TextDocument, Position, TokenType, Range } from '../service';

import { createScanner } from './template/parser/htmlScanner';

export interface LanguageRange extends Range {
  languageId: string;
  attributeValue?: boolean;
}

export interface VueDocumentRegions {
  getEmbeddedDocument (languageId: string): TextDocument;
  getLanguageRanges (range: Range): LanguageRange[];
  getLanguageAtPosition (position: Position): string;
  getLanguagesInDocument (): string[];
  getImportedScripts (): string[];
}

interface EmbeddedRegion { languageId: string; start: number; end: number; }

export function getDocumentRegions (document: TextDocument): VueDocumentRegions {
  const regions: EmbeddedRegion[] = [];
  const text = document.getText();
  const scanner = createScanner(text);
  let lastTagName = '';
  let lastAttributeName = '';
  let languageIdFromType = '';
  const importedScripts: string[] = [];

  let token = scanner.scan();
  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.Styles:
        regions.push({
          languageId: /^(sass|scss|less|postcss|stylus)$/.test(languageIdFromType) ? languageIdFromType : 'css',
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd()
        });
        languageIdFromType = '';
        break;
      case TokenType.Script:
        regions.push({
          languageId: languageIdFromType ? languageIdFromType : 'javascript',
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd()
        });
        languageIdFromType = '';
        break;
      case TokenType.StartTag:
        const tagName = scanner.getTokenText();
        if (tagName === 'template') {
          const templateRegion = scanTemplateRegion(scanner, text);
          if (templateRegion) {
            regions.push(templateRegion);
          }
        }
        lastTagName = tagName;
        lastAttributeName = '';
        break;
      case TokenType.AttributeName:
        lastAttributeName = scanner.getTokenText();
        break;
      case TokenType.AttributeValue:
        if (lastAttributeName === 'lang') {
          languageIdFromType = getLanguageIdFromLangAttr(scanner.getTokenText());
        } else {
          if (lastAttributeName === 'src' && lastTagName.toLowerCase() === 'script') {
            let value = scanner.getTokenText();
            if (value[0] === '\'' || value[0] === '"') {
              value = value.substr(1, value.length - 1);
            }
            importedScripts.push(value);
          }
        }
        lastAttributeName = '';
        break;
    }
    token = scanner.scan();
  }

  return {
    getLanguageRanges: (range: Range) => getLanguageRanges(document, regions, range),
    getEmbeddedDocument: (languageId: string) => getEmbeddedDocument(document, regions, languageId),
    getLanguageAtPosition: (position: Position) => getLanguageAtPosition(document, regions, position),
    getLanguagesInDocument: () => getLanguagesInDocument(document, regions),
    getImportedScripts: () => importedScripts
  };
}

function scanTemplateRegion (scanner: Scanner, text: string): EmbeddedRegion | null {
  let languageId = 'vue-html';

  let token: number;
  let start = 0;
  let end: number;

  // Scan until finding matching template EndTag
  // Also record immediate next StartTagClose to find start
  let unClosedTemplate = 1;
  let lastAttributeName = null;
  while (unClosedTemplate !== 0) {
    token = scanner.scan();
    if (token === TokenType.EOS) {
      return null;
    }

    if (token === TokenType.AttributeName) {
      lastAttributeName = scanner.getTokenText();
    } else if (token === TokenType.AttributeValue) {
      if (lastAttributeName === 'lang') {
        languageId = getLanguageIdFromLangAttr(scanner.getTokenText());
      }
      lastAttributeName = null;
    } else if (token === TokenType.StartTagClose && !start) {
      start = scanner.getTokenEnd();
    } else if (token === TokenType.StartTag && scanner.getTokenText() === 'template') {
      unClosedTemplate++;
    } else if (token === TokenType.EndTag && scanner.getTokenText() === 'template') {
      unClosedTemplate--;
    } else if (token === TokenType.Unknown) {
      if (scanner.getTokenText().charAt(0) === '<') {
        let offset = scanner.getTokenOffset();
        let unknownText = text.substr(offset, 11);
        if (unknownText === '</template>') {
          unClosedTemplate--;
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
    end
  };
}

function getLanguageIdFromLangAttr (lang: string): string {
  let languageIdFromType = removeQuotes(lang);
  if (languageIdFromType === 'jade') {
    languageIdFromType = 'pug';
  }
  if (languageIdFromType === 'ts') {
    languageIdFromType = 'typescript';
  }
  return languageIdFromType;
}

function getLanguageRanges (document: TextDocument, regions: EmbeddedRegion[], range: Range): LanguageRange[] {
  const result: LanguageRange[] = [];
  let currentPos = range ? range.start : Position.create(0, 0);
  let currentOffset = range ? document.offsetAt(range.start) : 0;
  const endOffset = range ? document.offsetAt(range.end) : document.getText().length;
  for (let region of regions) {
    if (region.end > currentOffset && region.start < endOffset) {
      const start = Math.max(region.start, currentOffset);
      const startPos = document.positionAt(start);
      if (currentOffset < region.start) {
        result.push({
          start: currentPos,
          end: startPos,
          languageId: 'vue'
        });
      }
      const end = Math.min(region.end, endOffset);
      const endPos = document.positionAt(end);
      if (end > region.start) {
        result.push({
          start: startPos,
          end: endPos,
          languageId: region.languageId
        });
      }
      currentOffset = end;
      currentPos = endPos;
    }
  }
  if (currentOffset < endOffset) {
    const endPos = range ? range.end : document.positionAt(endOffset);
    result.push({
      start: currentPos,
      end: endPos,
      languageId: 'vue'
    });
  }
  return result;
}

function getLanguagesInDocument (document: TextDocument, regions: EmbeddedRegion[]): string[] {
  const result = ['vue'];
  for (let region of regions) {
    if (region.languageId && result.indexOf(region.languageId) === -1) {
      result.push(region.languageId);
    }
  }
  return result;
}

function getLanguageAtPosition (document: TextDocument, regions: EmbeddedRegion[], position: Position): string {
  const offset = document.offsetAt(position);
  for (let region of regions) {
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region.languageId;
      }
    } else {
      break;
    }
  }
  return 'vue';
}

function getEmbeddedDocument (document: TextDocument, contents: EmbeddedRegion[], languageId: string): TextDocument {
  let oldContent = document.getText();
  let result = '';
  for (let c of contents) {
    if (c.languageId === languageId) {
      result = oldContent.substring(0, c.start).replace(/./g, ' ');
      result += oldContent.substring(c.start, c.end);
      break;
    }
  }
  return TextDocument.create(document.uri, languageId, document.version, result);
}
