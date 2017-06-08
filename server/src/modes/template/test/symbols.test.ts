/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';

import { TextDocument, SymbolInformation, SymbolKind, Location, Range } from 'vscode-languageserver-types';
import { parseHTMLDocument } from '../parser/htmlParser'
import { findDocumentSymbols } from '../services/htmlSymbolsProvider'

suite('HTML Symbols', () => {

    const TEST_URI = "test://test/test.html";

    let assertSymbols = function (symbols: SymbolInformation[], expected: SymbolInformation[]) {
        assert.deepEqual(symbols, expected);
    }

    let testSymbolsFor = function(value: string, expected: SymbolInformation[]) {
    let document = TextDocument.create(TEST_URI, 'html', 0, value);
    let htmlDoc = parseHTMLDocument(document);
        let symbols = findDocumentSymbols(document, htmlDoc);
        assertSymbols(symbols, expected);
    }

    test('Simple', () => {
        testSymbolsFor('<div></div>', [<SymbolInformation>{ containerName: '', name: 'div', kind: <SymbolKind>SymbolKind.Field, location: Location.create(TEST_URI, Range.create(0, 0, 0, 11)) }]);
        testSymbolsFor('<div><input checked id="test" class="checkbox"></div>', [{ containerName: '', name: 'div', kind: <SymbolKind>SymbolKind.Field, location: Location.create(TEST_URI, Range.create(0, 0, 0, 53)) },
            { containerName: 'div', name: 'input#test.checkbox', kind: <SymbolKind>SymbolKind.Field, location: Location.create(TEST_URI, Range.create(0, 5, 0, 47)) }]);
    });

    test('Id and classes', function() {
    var content = '<html id=\'root\'><body id="Foo" class="bar"><div class="a b"></div></body></html>';

    var expected = [
      { name: 'html#root', kind: SymbolKind.Field, containerName: '', location: Location.create(TEST_URI, Range.create(0, 0, 0, 80)) },
      { name: 'body#Foo.bar', kind: SymbolKind.Field, containerName: 'html#root', location: Location.create(TEST_URI, Range.create(0, 16, 0, 73)) },
            { name: 'div.a.b', kind: SymbolKind.Field, containerName: 'body#Foo.bar', location: Location.create(TEST_URI, Range.create(0, 43, 0, 66)) },
    ];

    testSymbolsFor(content, expected);
  });

   test('Self closing', function() {
    var content = '<html><br id="Foo"><br id=Bar></html>';

    var expected = [
      { name: 'html', kind: SymbolKind.Field, containerName: '', location: Location.create(TEST_URI, Range.create(0, 0, 0, 37)) },
      { name: 'br#Foo', kind: SymbolKind.Field, containerName: 'html', location: Location.create(TEST_URI, Range.create(0, 6, 0, 19)) },
            { name: 'br#Bar', kind: SymbolKind.Field, containerName: 'html', location: Location.create(TEST_URI, Range.create(0, 19, 0, 30)) },
    ];

    testSymbolsFor(content, expected);
  });

  test('No attrib', function() {
    var content = '<html><body><div></div></body></html>';

    var expected = [
      { name: 'html', kind: SymbolKind.Field, containerName: '', location: Location.create(TEST_URI, Range.create(0, 0, 0, 37)) },
      { name: 'body', kind: SymbolKind.Field, containerName: 'html', location: Location.create(TEST_URI, Range.create(0, 6, 0, 30)) },
      { name: 'div', kind: SymbolKind.Field, containerName: 'body', location: Location.create(TEST_URI, Range.create(0, 12, 0, 23)) }
    ];

    testSymbolsFor(content, expected);
  });
})
