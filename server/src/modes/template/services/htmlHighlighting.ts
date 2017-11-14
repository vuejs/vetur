import { HTMLDocument } from '../parser/htmlParser';
import { TokenType, createScanner } from '../parser/htmlScanner';
import { TextDocument, Range, Position, DocumentHighlightKind, DocumentHighlight } from 'vscode-languageserver-types';

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
  const startTagRange = getTagNameRange(TokenType.StartTag, document, node.start);
  const endTagRange =
    typeof node.endTagStart === 'number' && getTagNameRange(TokenType.EndTag, document, node.endTagStart);
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

function getTagNameRange(tokenType: TokenType, document: TextDocument, startOffset: number): Range | null {
  const scanner = createScanner(document.getText(), startOffset);
  let token = scanner.scan();
  while (token !== TokenType.EOS && token !== tokenType) {
    token = scanner.scan();
  }
  if (token !== TokenType.EOS) {
    return { start: document.positionAt(scanner.getTokenOffset()), end: document.positionAt(scanner.getTokenEnd()) };
  }
  return null;
}
