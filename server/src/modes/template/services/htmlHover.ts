import { HTMLDocument } from '../parser/htmlParser';
import { HtmlTokenType, createScanner } from '../parser/htmlScanner';
import { Range, Position, Hover } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { IHTMLTagProvider } from '../tagProviders/common';
import { NULL_HOVER } from '../../nullMode';
import { toMarkupContent } from '../../../utils/strings';

const TRIVIAL_TOKEN = [HtmlTokenType.StartTagOpen, HtmlTokenType.EndTagOpen, HtmlTokenType.Whitespace];

export function doHover(
  document: TextDocument,
  position: Position,
  htmlDocument: HTMLDocument,
  tagProviders: IHTMLTagProvider[]
): Hover {
  const offset = document.offsetAt(position);
  const node = htmlDocument.findNodeAt(offset);
  if (!node || !node.tag) {
    return NULL_HOVER;
  }

  function getTagHover(tag: string, range: Range, open: boolean): Hover {
    tag = tag.toLowerCase();
    for (const provider of tagProviders) {
      let hover: Hover | null = null;
      provider.collectTags((t, documentation) => {
        if (t !== tag) {
          return;
        }
        hover = { contents: toMarkupContent(documentation), range };
      });
      if (hover) {
        return hover;
      }
    }
    return NULL_HOVER;
  }

  function getAttributeHover(tag: string, attribute: string, range: Range): Hover {
    for (const provider of tagProviders) {
      let hover: Hover | null = null;
      provider.collectAttributes(tag, (attr, type, documentation) => {
        if (attribute !== attr) {
          return;
        }
        hover = { contents: toMarkupContent(documentation), range };
      });
      if (hover) {
        return hover;
      }
    }
    return NULL_HOVER;
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
    return NULL_HOVER;
  }
  const tagRange = {
    start: document.positionAt(scanner.getTokenOffset()),
    end: document.positionAt(scanner.getTokenEnd())
  };
  switch (token) {
    case HtmlTokenType.StartTag:
      return getTagHover(node.tag, tagRange, true);
    case HtmlTokenType.EndTag:
      return getTagHover(node.tag, tagRange, false);
    case HtmlTokenType.AttributeName:
      // TODO: treat : as special bind
      const attribute = scanner.getTokenText().replace(/^:/, '');
      return getAttributeHover(node.tag, attribute, tagRange);
  }

  return NULL_HOVER;
}
