/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import {TextDocument} from 'vscode-languageserver-types';

import { parseHTMLDocument } from '../parser/htmlParser'
import { doHover } from '../services/htmlHover'



suite('HTML Hover', () => {

  function assertHover(value: string, expectedHoverLabel?: string, expectedHoverOffset?: number): void {
    let offset = value.indexOf('|');
    value = value.substr(0, offset) + value.substr(offset + 1);

    let document = TextDocument.create('test://test/test.html', 'vue-html', 0, value);

    let position = document.positionAt(offset);
    let htmlDoc = parseHTMLDocument(document);

    let hover = doHover(document, position, htmlDoc);
    let contents = hover.contents as any
    if (expectedHoverLabel && contents.length === 0) {
      assert(false, 'expect hover, but nothing hover')
      return
    }
    if (!expectedHoverLabel && contents.length > 0) {
      assert(false, 'expect nothing, but get hover')
      return
    }
    if (!expectedHoverLabel && contents.length === 0) {
      return // every thing fine
    }
    let strOrMarked = Array.isArray(contents) ? contents[0] : contents
    let str = typeof strOrMarked === 'string' ? strOrMarked : strOrMarked.value
    assert.equal(str, expectedHoverLabel);
    assert.equal(document.offsetAt(hover.range!.start), expectedHoverOffset);
  }

  test('Single', function (): any {
    assertHover('|<html></html>');
    assertHover('<|html></html>', '<html>', 1);
    assertHover('<h|tml></html>', '<html>', 1);
    assertHover('<htm|l></html>', '<html>', 1);
    assertHover('<html|></html>', '<html>', 1);
    assertHover('<div|></div>', '<div>', 1);
    assertHover('<html>|</html>');
    assertHover('<html><|/html>');
    assertHover('<html></|html>', '</html>', 8);
    assertHover('<html></h|tml>', '</html>', 8);
    assertHover('<html></ht|ml>', '</html>', 8);
    assertHover('<html></htm|l>', '</html>', 8);
    assertHover('<html></html|>', '</html>', 8);
    assertHover('<|component></component>', '<component>', 1);
    assertHover('<html></html>|');
  });

  test('Attribute', function() {
    assertHover('<div a|ria-atomic="true"></div>', 'No doc for aria-atomic', 5)
    assertHover('<component inli|ne-template></component>', 'treat inner content as its template rather than distributed content', 11)
    assertHover('<div :v|-if="true"></div>', 'Conditionally renders the element based on the truthy\\-ness of the expression value\\.', 5)
  })
});
