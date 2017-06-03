import {TextDocument, Position, CompletionList, CompletionItemKind, Range, TextEdit, InsertTextFormat, CompletionItem} from 'vscode-languageserver-types';
import {HTMLDocument} from '../parser/htmlParser';
import {TokenType, createScanner, ScannerState} from '../parser/htmlScanner';
import {allTagProviders} from './tagProviders';
import {CompletionConfiguration} from '../index';

export function doComplete(document: TextDocument, position: Position, htmlDocument: HTMLDocument, settings?: CompletionConfiguration): CompletionList {

  let result: CompletionList = {
    isIncomplete: false,
    items: []
  };
  let tagProviders = allTagProviders.filter(p => p.isApplicable(document.languageId) && (!settings || settings[p.getId()] !== false));

  let offset = document.offsetAt(position);
  let node = htmlDocument.findNodeBefore(offset);
  if (!node) {
    return result;
  }
  let text = document.getText();
  let scanner = createScanner(text, node.start);
  let currentTag: string;
  let currentAttributeName: string;

  function getReplaceRange(replaceStart: number, replaceEnd: number = offset): Range {
    if (replaceStart > offset) {
      replaceStart = offset;
    }
    return { start: document.positionAt(replaceStart), end: document.positionAt(replaceEnd) };
  }

  function collectOpenTagSuggestions(afterOpenBracket: number, tagNameEnd?: number): CompletionList {
    let range = getReplaceRange(afterOpenBracket, tagNameEnd);
    tagProviders.forEach((provider) => {
      provider.collectTags((tag, label) => {
        result.items.push({
          label: tag,
          kind: CompletionItemKind.Property,
          documentation: label,
          textEdit: TextEdit.replace(range, tag),
          insertTextFormat: InsertTextFormat.PlainText
        });
      });
    });
    return result;
  }

  function getLineIndent(offset: number) {
    let start = offset;
    while (start > 0) {
      let ch = text.charAt(start - 1);
      if ("\n\r".indexOf(ch) >= 0) {
        return text.substring(start, offset);
      }
      if (!isWhiteSpace(ch)) {
        return null;
      }
      start--;
    }
    return text.substring(0, offset);
  }

  function collectCloseTagSuggestions(afterOpenBracket: number, matchingOnly: boolean, tagNameEnd: number = offset): CompletionList {
    let range = getReplaceRange(afterOpenBracket, tagNameEnd);
    let closeTag = isFollowedBy(text, tagNameEnd, ScannerState.WithinEndTag, TokenType.EndTagClose) ? '' : '>';
    let curr = node;
    while (curr) {
      let tag = curr.tag;
      if (tag && (!curr.closed || curr.endTagStart > offset)) {      
        let item : CompletionItem = {
          label: '/' + tag,
          kind: CompletionItemKind.Property,
          filterText: '/' + tag + closeTag,
          textEdit: TextEdit.replace(range, '/' + tag + closeTag),
          insertTextFormat: InsertTextFormat.PlainText
        };
        let startIndent = getLineIndent(curr.start);
        let endIndent = getLineIndent(afterOpenBracket - 1);
        if (startIndent !== null && endIndent !== null && startIndent !== endIndent) {
          let insertText = startIndent + '</' + tag + closeTag;
          item.textEdit = TextEdit.replace(getReplaceRange(afterOpenBracket - 1 - endIndent.length), insertText),
          item.filterText = endIndent + '</' + tag + closeTag;
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
          documentation: label,
          filterText: '/' + tag + closeTag,
          textEdit: TextEdit.replace(range,  '/' + tag + closeTag),
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

  function collectAttributeNameSuggestions(nameStart: number, nameEnd: number = offset): CompletionList {
    let range = getReplaceRange(nameStart, nameEnd);
    let value = isFollowedBy(text, nameEnd, ScannerState.AfterAttributeName, TokenType.DelimiterAssign) ? '' : '="$1"';
    let tag = currentTag.toLowerCase();
    tagProviders.forEach(provider => {
      provider.collectAttributes(tag, (attribute, type, documentation) => {
        let codeSnippet = attribute;
        if (type !== 'v' && value.length) {
          codeSnippet = codeSnippet + value;
        }
        let a: CompletionItem;
        result.items.push({
          label: attribute,
          kind: type === 'handler' ? CompletionItemKind.Function : CompletionItemKind.Value,
          textEdit: TextEdit.replace(range, codeSnippet),
          insertTextFormat: InsertTextFormat.Snippet,
          documentation
        });
      });
    });
    return result;
  }

  function collectAttributeValueSuggestions(valueStart: number, valueEnd?: number): CompletionList {
    let range: Range;
    let addQuotes: boolean;
    if (offset > valueStart && offset <= valueEnd && text[valueStart] === '"') {
      // inside attribute
      if (valueEnd > offset && text[valueEnd-1] === '"') {
        valueEnd--;
      }
      let wsBefore = getWordStart(text, offset, valueStart + 1);
      let wsAfter = getWordEnd(text, offset, valueEnd); 
      range = getReplaceRange(wsBefore, wsAfter);
      addQuotes = false
    } else {
      range = getReplaceRange(valueStart, valueEnd);
      addQuotes = true;
    }
    let tag = currentTag.toLowerCase();
    let attribute = currentAttributeName.toLowerCase();
    tagProviders.forEach(provider => {
      provider.collectValues(tag, attribute, value => {
        let insertText = addQuotes ? '"' + value + '"' : value;
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

  function scanNextForEndPos(nextToken: TokenType) : number {
    if (offset === scanner.getTokenEnd()) {
      token = scanner.scan();
      if (token === nextToken && scanner.getTokenOffset() === offset) {
        return scanner.getTokenEnd();
      }
    }
    return offset;
  }

  let token = scanner.scan();

  while (token !== TokenType.EOS && scanner.getTokenOffset() <= offset) {
    switch (token) {
      case TokenType.StartTagOpen:
        if (scanner.getTokenEnd() === offset) {
          let endPos = scanNextForEndPos(TokenType.StartTag);
          return collectTagSuggestions(offset, endPos);
        }
        break;
      case TokenType.StartTag:
        if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
          return collectOpenTagSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd());
        }
        currentTag = scanner.getTokenText();
        break;
      case TokenType.AttributeName:
        if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
          return collectAttributeNameSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd());
        }
        currentAttributeName = scanner.getTokenText();
        break;
      case TokenType.DelimiterAssign:
        if (scanner.getTokenEnd() === offset) {
          return collectAttributeValueSuggestions(scanner.getTokenEnd());
        }
        break;
      case TokenType.AttributeValue:
        if (scanner.getTokenOffset() <= offset && offset <= scanner.getTokenEnd()) {
          return collectAttributeValueSuggestions(scanner.getTokenOffset(), scanner.getTokenEnd());
        }
        break;
      case TokenType.Whitespace:
        if (offset <= scanner.getTokenEnd()) {
          switch (scanner.getScannerState()) {
            case ScannerState.AfterOpeningStartTag:
              let startPos = scanner.getTokenOffset();
              let endTagPos = scanNextForEndPos(TokenType.StartTag);
              return collectTagSuggestions(startPos, endTagPos);
            case ScannerState.WithinTag:
            case ScannerState.AfterAttributeName:
              return collectAttributeNameSuggestions(scanner.getTokenEnd());
            case ScannerState.BeforeAttributeValue:
              return collectAttributeValueSuggestions(scanner.getTokenEnd());
            case ScannerState.AfterOpeningEndTag:
              return collectCloseTagSuggestions(scanner.getTokenOffset() - 1, false);
          }
        }
        break;
      case TokenType.EndTagOpen:
        if (offset <= scanner.getTokenEnd()) {
          let afterOpenBracket = scanner.getTokenOffset() + 1;
          let endOffset = scanNextForEndPos(TokenType.EndTag);
          return collectCloseTagSuggestions(afterOpenBracket, false, endOffset);
        }
        break;
      case TokenType.EndTag:
        if (offset <= scanner.getTokenEnd()) {
          let start = scanner.getTokenOffset() - 1;
          while (start >= 0) {
            let ch = text.charAt(start);
            if (ch === '/') {
              return collectCloseTagSuggestions(start, false, scanner.getTokenEnd());
            } else if (!isWhiteSpace(ch)) {
              break;
            }
            start--;
          }
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

function isWhiteSpaceOrQuote(s: string): boolean {
  return /^[\s"]*$/.test(s);
}

function isFollowedBy(s: string, offset:number, intialState: ScannerState, expectedToken: TokenType) {
  let scanner = createScanner(s, offset, intialState);
  let token = scanner.scan();
  while (token === TokenType.Whitespace) {
    token = scanner.scan();
  }
  return token == expectedToken;
}

function getWordStart(s: string, offset: number, limit: number): number {
  while (offset > limit && !isWhiteSpace(s[offset-1])) {
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
