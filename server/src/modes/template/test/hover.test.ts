/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { parseHTMLDocument } from '../parser/htmlParser';
import { doHover } from '../services/htmlHover';
import { hoverDSL } from '../../test-util/hover-test-util';
import { allTagProviders } from '../tagProviders';

const html = hoverDSL({
  docUri: 'test://test/test.html',
  langId: 'vue-html',
  doHover(document, position) {
    const htmlAST = parseHTMLDocument(document);
    return doHover(document, position, htmlAST, allTagProviders);
  }
});

suite('HTML Hover', () => {
  test('Single', function (): any {
    html`|<html></html>`.hasNothing();
    html`<|html></html>`.hasHoverAt('<html>', 1);
    html`<h|tml></html>`.hasHoverAt('<html>', 1);
    html`<htm|l></html>`.hasHoverAt('<html>', 1);
    html`<html|></html>`.hasHoverAt('<html>', 1);
    html`<div|></div>`.hasHoverAt('<div>', 1);
    html`<html>|</html>`.hasNothing();
    html`<html><|/html>`.hasNothing();
    html`<html></|html>`.hasHoverAt('</html>', 8);
    html`<html></h|tml>`.hasHoverAt('</html>', 8);
    html`<html></ht|ml>`.hasHoverAt('</html>', 8);
    html`<html></htm|l>`.hasHoverAt('</html>', 8);
    html`<html></html|>`.hasHoverAt('</html>', 8);
    html`<|component></component>`.hasHoverAt('<component>', 1);
    html`<html></html>|`.hasNothing();
    html`<div>{{tes|t}}</div>`.hasNothing();
  });

  test('Attribute', function () {
    html`<div a|ria-atomic="true"></div>`.hasHoverAt('No doc for aria-atomic', 5);
    html`<component inli|ne-template></component>`.hasHoverAt(
      'treat inner content as its template rather than distributed content',
      11
    );
    html`<div :v|-if="true"></div>`.hasHoverAt(
      'Conditionally renders the element based on the truthy\\-ness of the expression value\\.',
      5
    );
  });
});
