/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-types';
import * as url from 'url';

import { findDocumentLinks } from '../services/htmlLinks';
import { DocumentContext } from '../../../types';

suite('HTML Link Detection', () => {
  function getDocumentContext(documentUrl: string): DocumentContext {
    return {
      resolveReference: (ref, base) => {
        if (base) {
          documentUrl = url.resolve(documentUrl, base);
        }
        return url.resolve(documentUrl, ref);
      }
    };
  }

  function testLinkCreation(modelUrl: string, tokenContent: string, expected: string | null): void {
    const document = TextDocument.create(modelUrl, 'html', 0, `<a href="${tokenContent}">`);
    const links = findDocumentLinks(document, getDocumentContext(modelUrl));
    assert.equal(links[0] && links[0].target, expected);
  }

  function testLinkDetection(value: string, expectedLinks: { offset: number; target: string }[]): void {
    const document = TextDocument.create('test://test/test.html', 'html', 0, value);
    const links = findDocumentLinks(document, getDocumentContext(document.uri));
    assert.deepEqual(links.map(l => ({ offset: l.range.start.character, target: l.target })), expectedLinks);
  }

  test('Link creation', () => {
    testLinkCreation('http://model/1', 'javascript:void;', null);
    testLinkCreation('http://model/1', ' \tjavascript:alert(7);', null);
    testLinkCreation('http://model/1', ' #relative', null);
    testLinkCreation(
      'http://model/1',
      'file:///C:\\Alex\\src\\path\\to\\file.txt',
      'file:///C:\\Alex\\src\\path\\to\\file.txt'
    );
    testLinkCreation('http://model/1', 'http://www.microsoft.com/', 'http://www.microsoft.com/');
    testLinkCreation('http://model/1', 'https://www.microsoft.com/', 'https://www.microsoft.com/');
    testLinkCreation('http://model/1', '//www.microsoft.com/', 'http://www.microsoft.com/');
    testLinkCreation('http://model/x/1', 'a.js', 'http://model/x/a.js');
    testLinkCreation('http://model/x/1', './a2.js', 'http://model/x/a2.js');
    testLinkCreation('http://model/x/1', '/b.js', 'http://model/b.js');
    testLinkCreation('http://model/x/y/1', '../../c.js', 'http://model/c.js');

    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', 'javascript:void;', null);
    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', ' \tjavascript:alert(7);', null);
    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', ' #relative', null);
    testLinkCreation(
      'file:///C:/Alex/src/path/to/file.txt',
      'file:///C:\\Alex\\src\\path\\to\\file.txt',
      'file:///C:\\Alex\\src\\path\\to\\file.txt'
    );
    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', 'http://www.microsoft.com/', 'http://www.microsoft.com/');
    testLinkCreation(
      'file:///C:/Alex/src/path/to/file.txt',
      'https://www.microsoft.com/',
      'https://www.microsoft.com/'
    );
    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', '  //www.microsoft.com/', 'http://www.microsoft.com/');
    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', 'a.js', 'file:///C:/Alex/src/path/to/a.js');
    testLinkCreation('file:///C:/Alex/src/path/to/file.txt', '/a.js', 'file:///a.js');

    testLinkCreation(
      'https://www.test.com/path/to/file.txt',
      'file:///C:\\Alex\\src\\path\\to\\file.txt',
      'file:///C:\\Alex\\src\\path\\to\\file.txt'
    );
    testLinkCreation('https://www.test.com/path/to/file.txt', '//www.microsoft.com/', 'https://www.microsoft.com/');
    testLinkCreation('https://www.test.com/path/to/file.txt', '//www.microsoft.com/', 'https://www.microsoft.com/');

    // invalid uris are ignored
    testLinkCreation('https://www.test.com/path/to/file.txt', '%', null);

    // Bug #18314: Ctrl + Click does not open existing file if folder's name starts with 'c' character
    testLinkCreation(
      'file:///c:/Alex/working_dir/18314-link-detection/test.html',
      '/class/class.js',
      'file:///class/class.js'
    );
  });

  test('Link detection', () => {
    testLinkDetection('<img src="foo.png">', [{ offset: 10, target: 'test://test/foo.png' }]);
    testLinkDetection('<a href="http://server/foo.html">', [{ offset: 9, target: 'http://server/foo.html' }]);
    testLinkDetection('<img src="">', []);
    testLinkDetection('<LINK HREF="a.html">', [{ offset: 12, target: 'test://test/a.html' }]);
    testLinkDetection('<LINK HREF="a.html\n>\n', []);

    testLinkDetection('<html><base href="docs/"><img src="foo.png"></html>', [
      { offset: 18, target: 'test://test/docs/' },
      { offset: 35, target: 'test://test/docs/foo.png' }
    ]);
    testLinkDetection('<html><base href="http://www.example.com/page.html"><img src="foo.png"></html>', [
      { offset: 18, target: 'http://www.example.com/page.html' },
      { offset: 62, target: 'http://www.example.com/foo.png' }
    ]);
  });
});
