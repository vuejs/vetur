import { HTMLDocument } from '../parser/htmlParser';
import { TokenType, createScanner } from '../parser/htmlScanner';
import { TextDocument, Range, Position, Definition } from 'vscode-languageserver-types';
import { ComponentInfo } from '../../script/findComponents';

const TRIVIAL_TOKEN = [TokenType.StartTagOpen, TokenType.EndTagOpen, TokenType.Whitespace];

export function findDefinition(
  document: TextDocument,
  position: Position,
  htmlDocument: HTMLDocument,
  componentInfos: ComponentInfo[]
): Definition {
  const offset = document.offsetAt(position);
  const node = htmlDocument.findNodeAt(offset);
  if (!node || !node.tag) {
    return [];
  }
  function getTagDefinition(tag: string, range: Range, open: boolean): Definition {
    tag = tag.toLowerCase();
    for (const comp of componentInfos) {
      if (tag === comp.name) {
        return comp.definition || [];
      }
    }
    return [];
  }

  const inEndTag = node.endTagStart && offset >= node.endTagStart; // <html></ht|ml>
  const startOffset = inEndTag ? node.endTagStart : node.start;
  const scanner = createScanner(document.getText(), startOffset);
  let token = scanner.scan();

  function shouldAdvance() {
    if (token === TokenType.EOS) {
      return false;
    }
    const tokenEnd = scanner.getTokenEnd();
    if (tokenEnd < offset) {
      return true;
    }

    if (tokenEnd === offset) {
      return TRIVIAL_TOKEN.includes(token);
    }
    return false;
  }

  while (shouldAdvance()) {
    token = scanner.scan();
  }

  if (offset > scanner.getTokenEnd()) {
    return [];
  }
  const tagRange = {
    start: document.positionAt(scanner.getTokenOffset()),
    end: document.positionAt(scanner.getTokenEnd())
  };
  switch (token) {
    case TokenType.StartTag:
      return getTagDefinition(node.tag, tagRange, true);
    case TokenType.EndTag:
      return getTagDefinition(node.tag, tagRange, false);
  }

  return [];
}
