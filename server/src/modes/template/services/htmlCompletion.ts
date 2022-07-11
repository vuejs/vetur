import {
  Position,
  CompletionList,
  CompletionItemKind,
  Range,
  TextEdit,
  InsertTextFormat,
  CompletionItem
} from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { HTMLDocument } from '../parser/htmlParser';
import { HtmlTokenType, createScanner, ScannerState } from '../parser/htmlScanner';
import { IHTMLTagProvider } from '../tagProviders/common';
import * as emmet from 'vscode-emmet-helper';
import { NULL_COMPLETION } from '../../nullMode';
import { getModifierProvider, Modifier } from '../modifierProvider';
import { toMarkupContent } from '../../../utils/strings';
import { TagProviderPriority } from '../tagProviders/common';
import { kebabCase } from 'lodash';

export function doComplete(
  document: TextDocument,
  position: Position,
  htmlDocument: HTMLDocument,
  tagProviders: IHTMLTagProvider[],
  emmetConfig: emmet.VSCodeEmmetConfig,
  autoImportCompletions?: CompletionItem[]
): CompletionList {
  const modifierProvider = getModifierProvider();

  const result: CompletionList = {
    isIncomplete: false,
    items: []
  };

  const offset = document.offsetAt(position);
  const node = htmlDocument.findNodeBefore(offset);
  if (!node || (node.isInterpolation && offset <= node.end)) {
    return result;
  }

  const text = document.getText();
  const scanner = createScanner(text, node.start);
  let currentTag: string;
  let currentAttributeName = '';

  function getReplaceRange(replaceStart: number, replaceEnd: number = offset): Range {
    if (replaceStart > offset) {
      replaceStart = offset;
    }
    return { start: document.positionAt(replaceStart), end: document.positionAt(replaceEnd) };
  }

  function collectOpenTagSuggestions(afterOpenBracket: number, tagNameEnd?: number): CompletionList {
    const range = getReplaceRange(afterOpenBracket, tagNameEnd);
    tagProviders.forEach(provider => {
      const priority = provider.priority;
      provider.collectTags((tag, label) => {
        result.items.push({
          label: tag,
          kind: CompletionItemKind.Property,
          documentation: toMarkupContent(label),
          textEdit: TextEdit.replace(range, tag),
          sortText: priority + tag,
          insertTextFormat: InsertTextFormat.PlainText
        });
      });
    });
    autoImportCompletions?.forEach(item => {
      result.items.push({
        ...item,
        kind: CompletionItemKind.Property,
        textEdit: TextEdit.replace(range, item.label),
        sortText: TagProviderPriority.UserCode + item.label,
        insertTextFormat: InsertTextFormat.PlainText
      });
    });
    return result;
  }

  function getLineIndent(offset: number) {
    let start = offset;
    while (start > 0) {
      const ch = text.charAt(start - 1);
      if ('\n\r'.indexOf(ch) >= 0) {
        return text.substring(start, offset);
      }
      if (!isWhiteSpace(ch)) {
        return null;
      }
      start--;
    }
    return text.substring(0, offset);
  }

  function collectCloseTagSuggestions(
    afterOpenBracket: number,
    matchingOnly: boolean,
    tagNameEnd: number = offset
  ): CompletionList {
    const range = getReplaceRange(afterOpenBracket, tagNameEnd);
    const closeTag = isFollowedBy(text, tagNameEnd, ScannerState.WithinEndTag, HtmlTokenType.EndTagClose) ? '' : '>';
    let curr = node;
    while (curr) {
      const tag = curr.tag;
      if (tag && (!curr.closed || (curr.endTagStart && curr.endTagStart > offset))) {
        const item: CompletionItem = {
          label: '/' + tag,
          kind: CompletionItemKind.Property,
          filterText: '/' + tag + closeTag,
          textEdit: TextEdit.replace(range, '/' + tag + closeTag),
          insertTextFormat: InsertTextFormat.PlainText
        };
        const startIndent = getLineIndent(curr.start);
        const endIndent = getLineIndent(afterOpenBracket - 1);
        if (startIndent !== null && endIndent !== null && startIndent !== endIndent) {
          const insertText = startIndent + '</' + tag + closeTag;
          (item.textEdit = TextEdit.replace(getReplaceRange(afterOpenBracket - 1 - endIndent.length), insertText)),
            (item.filterText = endIndent + '</' + tag + closeTag);
        }
        result.items.push(item);
        return result;
      }
      curr = curr.parent;
    }
    if (matchingOnly) {
      return result;
    }

    tagProviders.forEach(provider => {
      provider.collectTags((tag, label) => {
        result.items.push({
          label: '/' + tag,
          kind: CompletionItemKind.Property,
          documentation: toMarkupContent(label),
          filterText: '/' + tag + closeTag,
          textEdit: TextEdit.replace(range, '/' + tag + closeTag),
          insertTextFormat: InsertTextFormat.PlainText
        });
      });
    });
    return result;
  }

  function collectTagSuggestions(tagStart: number, tagEnd: number): CompletionList {
    collectOpenTagSuggestions(tagStart, tagEnd);
    collectCloseTagSuggestions(tagStart, true, tagEnd);
    return result;
  }

  function getUsedAttributes(offset: number) {
    const node = htmlDocument.findNodeBefore(offset);
    return new Set(node.attributeNames.map(normalizeAttributeNameToKebabCase));
  }

  function collectAttributeNameSuggestions(nameStart: number, nameEnd: number = offset): CompletionList {
    const usedAttributes = getUsedAttributes(nameStart);
    const currentAttribute = scanner.getTokenText();
    const execArray = /^[:@]/.exec(currentAttribute);
    const filterPrefix = execArray ? execArray[0] : '';
    const start = filterPrefix ? nameStart + 1 : nameStart;
    const range = getReplaceRange(start, nameEnd);
    const value = isFollowedBy(text, nameEnd, ScannerState.AfterAttributeName, HtmlTokenType.DelimiterAssign)
      ? ''
      : '="$1"';
    tagProviders.forEach(provider => {
      const priority = provider.priority;
      provider.collectAttributes(currentTag, (attribute, type, documentation) => {
        if (
          // include current typing attribute for completing `="$1"`
          !(attribute === currentAttribute && text[nameEnd] !== '=') &&
          // can listen to same event by adding modifiers
          type !== 'event' &&
          // `class` and `:class`, `style` and `:style` can coexist
          attribute !== 'class' &&
          attribute !== 'style' &&
          usedAttributes.has(normalizeAttributeNameToKebabCase(attribute))
        ) {
          return;
        }
        if ((type === 'event' && filterPrefix !== '@') || (type !== 'event' && filterPrefix === '@')) {
          return;
        }
        let codeSnippet = attribute;
        if (type !== 'v' && value.length) {
          codeSnippet = codeSnippet + value;
        }
        if ((filterPrefix === ':' && codeSnippet[0] === ':') || (filterPrefix === '@' && codeSnippet[0] === '@')) {
          codeSnippet = codeSnippet.slice(1);
        }
        const trimedName = attribute.replace(/^(?::|@)/, '');
        result.items.push({
          label: attribute,
          kind: type === 'event' ? CompletionItemKind.Function : CompletionItemKind.Value,
          textEdit: TextEdit.replace(range, codeSnippet),
          insertTextFormat: InsertTextFormat.Snippet,
          sortText: priority + trimedName,
          filterText: trimedName,
          documentation: toMarkupContent(documentation)
        });
      });
    });
    const attributeName = scanner.getTokenText();
    if (/\.$/.test(attributeName)) {
      function addModifier(modifiers: { items: Modifier[]; priority: number }) {
        modifiers.items.forEach(modifier => {
          result.items.push({
            label: modifier.label,
            kind: CompletionItemKind.Method,
            textEdit: TextEdit.insert(document.positionAt(nameEnd), modifier.label),
            insertTextFormat: InsertTextFormat.Snippet,
            sortText: modifiers.priority + modifier.label,
            documentation: toMarkupContent(modifier.documentation)
          });
        });
      }

      if (attributeName.startsWith('@') || attributeName.startsWith('v-on')) {
        addModifier(modifierProvider.eventModifiers);
      }

      const execArray = /^(?:@|v-on:)([A-Za-z]*)\.?/.exec(attributeName);
      const eventName = execArray && execArray[1] ? execArray[1] : '';

      const keyEvent = ['keydown', 'keypress', 'keyup'];
      if (keyEvent.includes(eventName)) {
        addModifier(modifierProvider.keyModifiers);
        addModifier(modifierProvider.systemModifiers);
      }

      const mouseEvent = ['click', 'dblclick', 'mouseup', 'mousedown'];
      if (mouseEvent.includes(eventName)) {
        addModifier(modifierProvider.mouseModifiers);
        addModifier(modifierProvider.systemModifiers);
      }

      if (attributeName.startsWith('v-bind') || attributeName.startsWith(':')) {
        addModifier(modifierProvider.propsModifiers);
      }

      if (attributeName.startsWith('v-model')) {
        addModifier(modifierProvider.vModelModifiers);
      }
    }
    return result;
  }

  function collectAttributeValueSuggestions(attr: string, valueStart: number, valueEnd?: number): CompletionList {
    if (attr.startsWith('v-') || attr.startsWith('@') || attr.startsWith(':')) {
      return NULL_COMPLETION;
    }

    let range: Range;
    let addQuotes: boolean;
    if (valueEnd && offset > valueStart && offset <= valueEnd && text[valueStart] === '"') {
      // inside attribute
      if (valueEnd > offset && text[valueEnd - 1] === '"') {
        valueEnd--;
      }
      const wsBefore = getWordStart(text, offset, valueStart + 1);
      const wsAfter = getWordEnd(text, offset, valueEnd);
      range = getReplaceRange(wsBefore, wsAfter);
      addQuotes = false;
    } else {
      range = getReplaceRange(valueStart, valueEnd);
      addQuotes = true;
    }
    const attribute = currentAttributeName.toLowerCase();
    tagProviders.forEach(provider => {
      provider.collectValues(currentTag, attribute, value => {
        const insertText = addQuotes ? '"' + value + '"' : value;
        result.items.push({
          label: value,
          filterText: insertText,
          kind: CompletionItemKind.Unit,
          textEdit: TextEdit.replace(range, insertText),
          insertTextFormat: InsertTextFormat.PlainText
        });
      });
    });
    return result;
  }

  function scanNextForEndPos(nextToken: HtmlTokenType): number {
    if (offset === scanner.getTokenEnd()) {
      token = scanner.scan();
      if (token === nextToken && scanner.getTokenOffset() === offset) {
        return scanner.getTokenEnd();
      }
    }
    return offset;
  }

  let token = scanner.scan();

  while (token !== HtmlTokenType.EOS && scanner.getTokenOffset() <= offset) {
    switch (token) {
      case HtmlTokenType.StartTagOpen:
        if (scanner.getTokenEnd() === offset) {
          const endPos = scanNextForEndPos(HtmlTokenType.StartTag);
          return collectTagSuggestions(offset, endPos);
        }
        break;
      case HtmlTokenType.StartTag:
        if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
          return collectOpenTagSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd());
        }
        currentTag = scanner.getTokenText();
        break;
      case HtmlTokenType.AttributeName:
        if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
          return collectAttributeNameSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd());
        }
        currentAttributeName = scanner.getTokenText();
        break;
      case HtmlTokenType.DelimiterAssign:
        if (scanner.getTokenEnd() === offset) {
          return collectAttributeValueSuggestions(currentAttributeName, scanner.getTokenEnd());
        }
        break;
      case HtmlTokenType.AttributeValue:
        if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
          if (currentAttributeName === 'style') {
            const emmetCompletions = emmet.doComplete(document, position, 'css', emmetConfig);
            return emmetCompletions || NULL_COMPLETION;
          } else {
            return collectAttributeValueSuggestions(
              currentAttributeName,
              scanner.getTokenOffset(),
              scanner.getTokenEnd()
            );
          }
        }
        break;
      case HtmlTokenType.Whitespace:
        if (offset <= scanner.getTokenEnd()) {
          switch (scanner.getScannerState()) {
            case ScannerState.AfterOpeningStartTag:
              const startPos = scanner.getTokenOffset();
              const endTagPos = scanNextForEndPos(HtmlTokenType.StartTag);
              return collectTagSuggestions(startPos, endTagPos);
            case ScannerState.WithinTag:
            case ScannerState.AfterAttributeName:
              return collectAttributeNameSuggestions(scanner.getTokenEnd());
            case ScannerState.BeforeAttributeValue:
              return collectAttributeValueSuggestions(currentAttributeName, scanner.getTokenEnd());
            case ScannerState.AfterOpeningEndTag:
              return collectCloseTagSuggestions(scanner.getTokenOffset() - 1, false);
          }
        }
        break;
      case HtmlTokenType.EndTagOpen:
        if (offset <= scanner.getTokenEnd()) {
          const afterOpenBracket = scanner.getTokenOffset() + 1;
          const endOffset = scanNextForEndPos(HtmlTokenType.EndTag);
          return collectCloseTagSuggestions(afterOpenBracket, false, endOffset);
        }
        break;
      case HtmlTokenType.EndTag:
        if (offset <= scanner.getTokenEnd()) {
          let start = scanner.getTokenOffset() - 1;
          while (start >= 0) {
            const ch = text.charAt(start);
            if (ch === '/') {
              return collectCloseTagSuggestions(start, false, scanner.getTokenEnd());
            } else if (!isWhiteSpace(ch)) {
              break;
            }
            start--;
          }
        }
        break;
      case HtmlTokenType.Content:
        if (offset <= scanner.getTokenEnd()) {
          return emmet.doComplete(document, position, 'html', emmetConfig) ?? NULL_COMPLETION;
        }
        break;
      default:
        if (offset <= scanner.getTokenEnd()) {
          return result;
        }
        break;
    }
    token = scanner.scan();
  }
  return result;
}

function isWhiteSpace(s: string): boolean {
  return /^\s*$/.test(s);
}

function isFollowedBy(s: string, offset: number, intialState: ScannerState, expectedToken: HtmlTokenType) {
  const scanner = createScanner(s, offset, intialState);
  let token = scanner.scan();
  while (token === HtmlTokenType.Whitespace) {
    token = scanner.scan();
  }
  return token === expectedToken;
}

function getWordStart(s: string, offset: number, limit: number): number {
  while (offset > limit && !isWhiteSpace(s[offset - 1])) {
    offset--;
  }
  return offset;
}

function getWordEnd(s: string, offset: number, limit: number): number {
  while (offset < limit && !isWhiteSpace(s[offset])) {
    offset++;
  }
  return offset;
}

export function normalizeAttributeNameToKebabCase(attr: string): string {
  let result = attr;

  if (result.startsWith('v-model:')) {
    result = attr.slice('v-model:'.length);
  }

  if (result.startsWith('v-bind:')) {
    result = attr.slice('v-bind:'.length);
  } else if (result.startsWith(':')) {
    result = attr.slice(':'.length);
  }

  // Remove modifiers
  if (result.includes('.')) {
    result = result.slice(0, result.indexOf('.'));
  }

  result = kebabCase(result);

  return result;
}
