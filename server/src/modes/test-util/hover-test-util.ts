import * as assert from 'assert'
import {TextDocument, Position, Hover } from 'vscode-languageserver-types'

export interface HoverTestSetup {
  docUri: string
  langId: string
  doHover(document: TextDocument, position: Position): Hover
}

export class HoverAsserter {
  constructor(public hover: Hover, public document: TextDocument) {}
  hasNothing() {
    let contents = this.hover.contents
    if (Array.isArray(contents) || typeof contents === 'string') {
      assert(contents.length === 0, 'expect nothing, but get hover: ' + contents)
    } else {
    }
  }
  hasHoverAt(label: string, offset: number) {
    let contents = this.hover.contents
    if (Array.isArray(contents) || typeof contents === 'string') {
      assert(contents.length !== 0, 'expect hover, but get nothing')
    } else {
      assert(contents.value.length !== 0, 'expect hover, but get nothing')
    }
    let strOrMarked = Array.isArray(contents) ? contents[0] : contents
    let str = typeof strOrMarked === 'string' ? strOrMarked : strOrMarked.value
    assert.equal(str, label)
    let hover = this.hover
    assert.equal(this.document.offsetAt(hover.range!.start), offset);
  }
}
export function hoverDSL(setup: HoverTestSetup) {
  return function test([value]: TemplateStringsArray) {
    let offset = value.indexOf('|')
    value = value.substr(0, offset) + value.substr(offset + 1)
    let document = TextDocument.create(setup.docUri, setup.langId, 0, value)

    let position = document.positionAt(offset)

    let hover = setup.doHover(document, position)
    return new HoverAsserter(hover, document)
  }
}
