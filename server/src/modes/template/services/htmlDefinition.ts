import { HTMLDocument } from '../parser/htmlParser';
import { TokenType, createScanner } from '../parser/htmlScanner';
import { Range, Position, Location } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { VueFileInfo } from '../../../services/vueInfoService';
import { URI } from 'vscode-uri';
import { kebabCase } from 'lodash';

const TRIVIAL_TOKEN = [TokenType.StartTagOpen, TokenType.EndTagOpen, TokenType.Whitespace];

export function findDefinition(
  document: TextDocument,
  position: Position,
  htmlDocument: HTMLDocument,
  vueFileInfo?: VueFileInfo
): Location[] {
  const offset = document.offsetAt(position);
  const node = htmlDocument.findNodeAt(offset);
  if (!node || !node.tag) {
    return [];
  }

  function getTagDefinition(tag: string, range: Range, open: boolean): Location[] {
    if (vueFileInfo && vueFileInfo.componentInfo.childComponents) {
      for (const cc of vueFileInfo.componentInfo.childComponents) {
        if (![tag, tag.toLowerCase(), kebabCase(tag)].includes(cc.name)) {
          continue;
        }
        if (!cc.definition) {
          continue;
        }

        const loc: Location = {
          uri: URI.file(cc.definition.path).toString(),
          // Todo: Resolve actual default export range
          range: Range.create(0, 0, 0, 0)
        };
        return [loc];
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
