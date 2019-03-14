import { HTMLDocument } from '../parser/htmlParser';
import { TokenType, createScanner } from '../parser/htmlScanner';
import { TextDocument, Range, Position, Hover, MarkedString } from 'vscode-languageserver-types';
import { IHTMLTagProvider } from '../tagProviders';
import { NULL_HOVER } from '../../nullMode';

const TRIVIAL_TOKEN = [TokenType.StartTagOpen, TokenType.EndTagOpen, TokenType.Whitespace];

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
        if (t === tag) {
          if (typeof documentation === 'string') {
            const contents = [documentation ? MarkedString.fromPlainText(documentation) : ''];
            hover = { contents, range };
          } else {
            const contents = documentation ? documentation : MarkedString.fromPlainText('');
            hover = { contents, range };
          }
        }
      });
      if (hover) {
        return hover;
      }
    }
    return NULL_HOVER;
  }

  function getAttributeHover(tag: string, attribute: string, range: Range): Hover {
    tag = tag.toLowerCase();
    let hover: Hover = NULL_HOVER;
    for (const provider of tagProviders) {
      provider.collectAttributes(tag, (attr, type, documentation) => {
        if (attribute !== attr) {
          return;
        }
        if (typeof documentation === 'string') {
          const contents = [documentation ? MarkedString.fromPlainText(documentation) : ''];
          hover = { contents, range };
        } else {
          const contents = documentation ? documentation : MarkedString.fromPlainText('');
          hover = { contents, range };
        }
      });
    }
    return hover;
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
    return NULL_HOVER;
  }
  const tagRange = {
    start: document.positionAt(scanner.getTokenOffset()),
    end: document.positionAt(scanner.getTokenEnd())
  };
  switch (token) {
    case TokenType.StartTag:
      return getTagHover(node.tag, tagRange, true);
    case TokenType.EndTag:
      return getTagHover(node.tag, tagRange, false);
    case TokenType.AttributeName:
      // TODO: treat : as special bind
      const attribute = scanner.getTokenText().replace(/^:/, '');
      return getAttributeHover(node.tag, attribute, tagRange);
  }

  return NULL_HOVER;
}
