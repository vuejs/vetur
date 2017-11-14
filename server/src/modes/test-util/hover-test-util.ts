import * as assert from 'assert';
import { TextDocument, Position, Hover } from 'vscode-languageserver-types';

export interface HoverTestSetup {
  docUri: string;
  langId: string;
  doHover(document: TextDocument, position: Position): Hover;
}

export class HoverAsserter {
  constructor(public hover: Hover, public document: TextDocument) {}
  hasNothing() {
    const contents = this.hover.contents;
    if (Array.isArray(contents) || typeof contents === 'string') {
      assert(contents.length === 0, 'expect nothing, but get hover: ' + contents);
    } else {
    }
  }
  hasHoverAt(label: string, offset: number) {
    const contents = this.hover.contents;
    if (Array.isArray(contents) || typeof contents === 'string') {
      assert(contents.length !== 0, 'expect hover, but get nothing');
    } else {
      assert(contents.value.length !== 0, 'expect hover, but get nothing');
    }
    const strOrMarked = Array.isArray(contents) ? contents[0] : contents;
    const str = typeof strOrMarked === 'string' ? strOrMarked : strOrMarked.value;
    assert.equal(str, label);
    const hover = this.hover;
    assert.equal(this.document.offsetAt(hover.range!.start), offset);
  }
}
export function hoverDSL(setup: HoverTestSetup) {
  return function test([value]: TemplateStringsArray) {
    const offset = value.indexOf('|');
    value = value.substr(0, offset) + value.substr(offset + 1);
    const document = TextDocument.create(setup.docUri, setup.langId, 0, value);

    const position = document.positionAt(offset);

    const hover = setup.doHover(document, position);
    return new HoverAsserter(hover, document);
  };
}
