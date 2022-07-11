import { HTMLDocument } from '../parser/htmlParser';
import { HtmlTokenType, createScanner } from '../parser/htmlScanner';
import { Position, Location } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { VueFileInfo } from '../../../services/vueInfoService';
import { getTagDefinition } from '../../template-common/tagDefinition';

const TRIVIAL_TOKEN = [HtmlTokenType.StartTagOpen, HtmlTokenType.EndTagOpen, HtmlTokenType.Whitespace];

export function findDefinition(
  document: TextDocument,
  position: Position,
  htmlDocument: HTMLDocument,
  vueFileInfo?: VueFileInfo
): Location[] {
  if (!vueFileInfo) {
    return [];
  }

  const offset = document.offsetAt(position);
  const node = htmlDocument.findNodeAt(offset);
  if (!node || !node.tag) {
    return [];
  }

  const inEndTag = node.endTagStart && offset >= node.endTagStart; // <html></ht|ml>
  const startOffset = inEndTag ? node.endTagStart : node.start;
  const scanner = createScanner(document.getText(), startOffset);
  let token = scanner.scan();

  function shouldAdvance() {
    if (token === HtmlTokenType.EOS) {
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

  switch (token) {
    case HtmlTokenType.StartTag:
    case HtmlTokenType.EndTag:
      return getTagDefinition(vueFileInfo, node.tag);
  }

  return [];
}
