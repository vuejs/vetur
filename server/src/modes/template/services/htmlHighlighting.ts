import { HTMLDocument } from '../parser/htmlParser';
import { HtmlTokenType, createScanner } from '../parser/htmlScanner';
import { Range, Position, DocumentHighlightKind, DocumentHighlight } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';

export function findDocumentHighlights(
  document: TextDocument,
  position: Position,
  htmlDocument: HTMLDocument
): DocumentHighlight[] {
  const offset = document.offsetAt(position);
  const node = htmlDocument.findNodeAt(offset);
  if (!node.tag) {
    return [];
  }
  const result = [];
  const startTagRange = getTagNameRange(HtmlTokenType.StartTag, document, node.start);
  const endTagRange =
    typeof node.endTagStart === 'number' && getTagNameRange(HtmlTokenType.EndTag, document, node.endTagStart);
  if ((startTagRange && covers(startTagRange, position)) || (endTagRange && covers(endTagRange, position))) {
    if (startTagRange) {
      result.push({ kind: DocumentHighlightKind.Read, range: startTagRange });
    }
    if (endTagRange) {
      result.push({ kind: DocumentHighlightKind.Read, range: endTagRange });
    }
  }
  return result;
}

function isBeforeOrEqual(pos1: Position, pos2: Position) {
  return pos1.line < pos2.line || (pos1.line === pos2.line && pos1.character <= pos2.character);
}

function covers(range: Range, position: Position) {
  return isBeforeOrEqual(range.start, position) && isBeforeOrEqual(position, range.end);
}

function getTagNameRange(tokenType: HtmlTokenType, document: TextDocument, startOffset: number): Range | null {
  const scanner = createScanner(document.getText(), startOffset);
  let token = scanner.scan();
  while (token !== HtmlTokenType.EOS && token !== tokenType) {
    token = scanner.scan();
  }
  if (token !== HtmlTokenType.EOS) {
    return { start: document.positionAt(scanner.getTokenOffset()), end: document.positionAt(scanner.getTokenEnd()) };
  }
  return null;
}
