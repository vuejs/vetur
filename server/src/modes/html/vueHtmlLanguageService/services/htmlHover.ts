import { HTMLDocument } from '../parser/htmlParser';
import { TokenType, createScanner } from '../parser/htmlScanner';
import { TextDocument, Range, Position, Hover, MarkedString } from 'vscode-languageserver-types';
import { allTagProviders } from './tagProviders';

export function doHover(document: TextDocument, position: Position, htmlDocument: HTMLDocument): Hover {
  let offset = document.offsetAt(position);
  let node = htmlDocument.findNodeAt(offset);
  if (!node || !node.tag) {
    return void 0;
  }
  let tagProviders = allTagProviders.filter(p => p.isApplicable(document.languageId));
  function getTagHover(tag: string, range: Range, open: boolean): Hover {
    tag = tag.toLowerCase();
    for (let provider of tagProviders) {
      let hover: Hover;
      provider.collectTags((t, label) => {
        if (t === tag) {
          let tagLabel = open ? '<' + tag + '>' : '</' + tag + '>';
          hover = { contents: [ { language: 'html', value: tagLabel }, MarkedString.fromPlainText(label)], range };
        }
      });
      if (hover) {
        return hover;
      }
    }
    return void 0;
  }

  function getTagNameRange(tokenType: TokenType, startOffset: number): Range {
    let scanner = createScanner(document.getText(), startOffset);
    let token = scanner.scan();
    while (token !== TokenType.EOS && (scanner.getTokenEnd() < offset || scanner.getTokenEnd() == offset && token !== tokenType)) {
      token = scanner.scan();
    }
    if (token === tokenType && offset <= scanner.getTokenEnd()) {
      return { start: document.positionAt(scanner.getTokenOffset()), end: document.positionAt(scanner.getTokenEnd()) };
    }
    return null;
  }

  if (node.endTagStart && offset >= node.endTagStart) {
    let tagRange = getTagNameRange(TokenType.EndTag, node.endTagStart);
    if (tagRange) {
      return getTagHover(node.tag, tagRange, false);
    }
    return void 0;
  }

  let tagRange = getTagNameRange(TokenType.StartTag, node.start);
  if (tagRange) {
    return getTagHover(node.tag, tagRange, true);
  }
  return void 0;
}

