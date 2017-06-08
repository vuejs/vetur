/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as assert from 'assert';
import { CompletionConfiguration } from '../services/htmlCompletion';

import { CompletionList, TextDocument, CompletionItemKind } from 'vscode-languageserver-types';
import { applyEdits } from './textEditSupport';

import { parseHTMLDocument } from '../parser/htmlParser'
import { doComplete } from '../services/htmlCompletion'

export interface ItemDescription {
  label: string;
  documentation?: string;
  kind?: CompletionItemKind;
  resultText?: string;
  notAvailable?: boolean;
}


suite('HTML Completion', () => {

  let assertCompletion = function (completions: CompletionList, expected: ItemDescription, document: TextDocument, offset: number) {
    let matches = completions.items.filter(completion => {
      return completion.label === expected.label;
    });
    if (expected.notAvailable) {
      assert.equal(matches.length, 0, expected.label + " should not existing is results");
      return;
    }

    assert.equal(matches.length, 1, expected.label + " should only existing once: Actual: " + completions.items.map(c => c.label).join(', '));
    let match = matches[0];
    if (expected.documentation) {
      assert.equal(match.documentation, expected.documentation);
    }
    if (expected.kind) {
      assert.equal(match.kind, expected.kind);
    }
    if (expected.resultText) {
      assert.equal(applyEdits(document, [match.textEdit!]), expected.resultText);
    }
  };

  let testCompletionFor = function (value: string, expected: { count?: number, items?: ItemDescription[] }, settings?: CompletionConfiguration): PromiseLike<void> {
    let offset = value.indexOf('|');
    value = value.substr(0, offset) + value.substr(offset + 1);

    let document = TextDocument.create('test://test/test.html', 'vue-html', 0, value);
    let position = document.positionAt(offset);
    let htmlDoc = parseHTMLDocument(document);
    let list = doComplete(document, position, htmlDoc, settings);
    if (expected.count) {
      assert.equal(list.items, expected.count);
    }
    if (expected.items) {
      for (let item of expected.items) {
        assertCompletion(list, item, document, offset);
      }
    }
    return Promise.resolve();
  };

  function run(tests: PromiseLike<void>[], testDone: Function) {
    Promise.all(tests).then(() => {
      testDone();
    }, (error) => {
      testDone(error);
    });
  }


  test('Complete', function (testDone): any {
    run([
      testCompletionFor('<|', {
        items: [
          { label: 'iframe', resultText: '<iframe' },
          { label: 'h1', resultText: '<h1' },
          { label: 'div', resultText: '<div' },
        ]
      }),

      testCompletionFor('< |', {
        items: [
          { label: 'iframe', resultText: '<iframe' },
          { label: 'h1', resultText: '<h1' },
          { label: 'div', resultText: '<div' },
        ]
      }),

      testCompletionFor('<h|', {
        items: [
          { label: 'html', resultText: '<html' },
          { label: 'h1', resultText: '<h1' },
          { label: 'header', resultText: '<header' },
        ]
      }),

      testCompletionFor('<input|', {
        items: [
          { label: 'input', resultText: '<input' },
        ]
      }),
      testCompletionFor('<inp|ut', {
        items: [
          { label: 'input', resultText: '<input' },
        ]
      }),
      testCompletionFor('<|inp', {
        items: [
          { label: 'input', resultText: '<input' },
        ]
      }),
      testCompletionFor('<input |', {
        items: [
          { label: 'type', resultText: '<input type="$1"' },
          { label: 'style', resultText: '<input style="$1"' },
          { label: 'onmousemove', resultText: '<input onmousemove="$1"' },
        ]
      }),

      testCompletionFor('<input t|', {
        items: [
          { label: 'type', resultText: '<input type="$1"' },
          { label: 'tabindex', resultText: '<input tabindex="$1"' },
        ]
      }),

      testCompletionFor('<input t|ype', {
        items: [
          { label: 'type', resultText: '<input type="$1"' },
          { label: 'tabindex', resultText: '<input tabindex="$1"' },
        ]
      }),

      testCompletionFor('<input t|ype="text"', {
        items: [
          { label: 'type', resultText: '<input type="text"' },
          { label: 'tabindex', resultText: '<input tabindex="text"' },
        ]
      }),

      testCompletionFor('<input type="text" |', {
        items: [
          { label: 'style', resultText: '<input type="text" style="$1"' },
          { label: 'type', resultText: '<input type="text" type="$1"' },
          { label: 'size', resultText: '<input type="text" size="$1"' },
        ]
      }),

      testCompletionFor('<input type="text" s|', {
        items: [
          { label: 'style', resultText: '<input type="text" style="$1"' },
          { label: 'src', resultText: '<input type="text" src="$1"' },
          { label: 'size', resultText: '<input type="text" size="$1"' },
        ]
      }),

      testCompletionFor('<input di| type="text"', {
        items: [

          { label: 'disabled', resultText: '<input disabled type="text"' },
          { label: 'dir', resultText: '<input dir="$1" type="text"' },
        ]
      }),

      testCompletionFor('<input disabled | type="text"', {
        items: [
          { label: 'dir', resultText: '<input disabled dir="$1" type="text"' },
          { label: 'style', resultText: '<input disabled style="$1" type="text"' },
        ]
      }),

      testCompletionFor('<input type=|', {
        items: [
          { label: 'text', resultText: '<input type="text"' },
          { label: 'checkbox', resultText: '<input type="checkbox"' },
        ]
      }),
      testCompletionFor('<input type="c|', {
        items: [
          { label: 'color', resultText: '<input type="color' },
          { label: 'checkbox', resultText: '<input type="checkbox' },
        ]
      }),
      testCompletionFor('<input type="|', {
        items: [
          { label: 'color', resultText: '<input type="color' },
          { label: 'checkbox', resultText: '<input type="checkbox' },
        ]
      }),
      testCompletionFor('<input type= |', {
        items: [
          { label: 'color', resultText: '<input type= "color"' },
          { label: 'checkbox', resultText: '<input type= "checkbox"' },
        ]
      }),
      testCompletionFor('<input src="c" type="color|" ', {
        items: [
          { label: 'color', resultText: '<input src="c" type="color" ' },
        ]
      }),
      testCompletionFor('<iframe sandbox="allow-forms |', {
        items: [
          { label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals' },
        ]
      }),
      testCompletionFor('<iframe sandbox="allow-forms allow-modals|', {
        items: [
          { label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals' },
        ]
      }),
      testCompletionFor('<iframe sandbox="allow-forms all|"', {
        items: [
          { label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals"' },
        ]
      }),
      testCompletionFor('<iframe sandbox="allow-forms a|llow-modals "', {
        items: [
          { label: 'allow-modals', resultText: '<iframe sandbox="allow-forms allow-modals "' },
        ]
      }),
      testCompletionFor('<input src="c" type=color| ', {
        items: [
          { label: 'color', resultText: '<input src="c" type="color" ' },
        ]
      }),
      testCompletionFor('<div dir=|></div>', {
        items: [
          { label: 'ltr', resultText: '<div dir="ltr"></div>' },
          { label: 'rtl', resultText: '<div dir="rtl"></div>' },
        ]
      }),
      testCompletionFor('<ul><|>', {
        items: [
          { label: '/ul', resultText: '<ul></ul>' },
          { label: 'li', resultText: '<ul><li>' },
        ]
      }),
      testCompletionFor('<ul><li><|', {
        items: [
          { label: '/li', resultText: '<ul><li></li>' },
          { label: 'a', resultText: '<ul><li><a' },
        ]
      }),
      testCompletionFor('<goo></|>', {
        items: [
          { label: '/goo', resultText: '<goo></goo>' },
        ]
      }),
      testCompletionFor('<foo></f|', {
        items: [
          { label: '/foo', resultText: '<foo></foo>' },
        ]
      }),
      testCompletionFor('<foo></f|o', {
        items: [
          { label: '/foo', resultText: '<foo></foo>' },
        ]
      }),
      testCompletionFor('<foo></|fo', {
        items: [
          { label: '/foo', resultText: '<foo></foo>' },
        ]
      }),
      testCompletionFor('<foo></ |>', {
        items: [
          { label: '/foo', resultText: '<foo></foo>' },
        ]
      }),
      testCompletionFor('<span></ s|', {
        items: [
          { label: '/span', resultText: '<span></span>' },
        ]
      }),
      testCompletionFor('<li><br></ |>', {
        items: [
          { label: '/li', resultText: '<li><br></li>' },
        ]
      }),
      testCompletionFor('<li/|>', {
        count: 0
      }),
      testCompletionFor('  <div/|   ', {
        count: 0
      }),
      testCompletionFor('<foo><br/></ f|>', {
        items: [
          { label: '/foo', resultText: '<foo><br/></foo>' },
        ]
      }),
      testCompletionFor('<li><div/></|', {
        items: [
          { label: '/li', resultText: '<li><div/></li>' },
        ]
      }),
      testCompletionFor('<li><br/|>', { count: 0 }),
      testCompletionFor('<li><br>a/|', { count: 0 }),

      testCompletionFor('<foo><bar></bar></|   ', {
        items: [
          { label: '/foo', resultText: '<foo><bar></bar></foo>   ' },
        ]
      }),
      testCompletionFor('<div>\n  <form>\n    <div>\n      <label></label>\n      <|\n    </div>\n  </form></div>', {
        items: [
          { label: 'span', resultText: '<div>\n  <form>\n    <div>\n      <label></label>\n      <span\n    </div>\n  </form></div>' },

          { label: '/div', resultText: '<div>\n  <form>\n    <div>\n      <label></label>\n    </div>\n    </div>\n  </form></div>' },
        ]
      }),
      testCompletionFor('<body><div><div></div></div></|  >', {
        items: [
          { label: '/body', resultText: '<body><div><div></div></div></body  >' },
        ]
      }),
      testCompletionFor(['<body>', '  <div>', '    </|'].join('\n'), {
        items: [
          { label: '/div', resultText: ['<body>', '  <div>', '  </div>'].join('\n') },
        ]
      })
    ], testDone);
  });

  test('Vue complete', function (testDone) {
    run([
      testCompletionFor('<transition type=|></transition>', {
        items: [
          { label: 'transition', resultText: '<transition type="transition"></transition>' },
          { label: 'animation', resultText: '<transition type="animation"></transition>' },
        ]
      }),
    ], testDone);
  })

  test('Case sensitivity', function (testDone) {
    run([
      testCompletionFor('<LI></|', {
        items: [
          { label: '/LI', resultText: '<LI></LI>' },
          { label: '/li', notAvailable: true }
        ]
      }),
      testCompletionFor('<lI></|', {
        items: [
          { label: '/lI', resultText: '<lI></lI>' }
        ]
      }),
      testCompletionFor('<iNpUt |', {
        items: [
          { label: 'type', resultText: '<iNpUt type="$1"' }
        ]
      }),
      testCompletionFor('<INPUT TYPE=|', {
        items: [
          { label: 'color', resultText: '<INPUT TYPE="color"' }
        ]
      })
    ], testDone);
  });

  test('Handlebar Completion', function (testDone) {
    run([
      testCompletionFor('<script id="entry-template" type="text/x-handlebars-template"> <| </script>', {
        items: [
          { label: 'div', resultText: '<script id="entry-template" type="text/x-handlebars-template"> <div </script>' },
        ]
      })
    ], testDone);
  });

  test('Complete aria', function (testDone): any {
    let expectedAriaAttributes = [
      { label: 'aria-activedescendant' },
      { label: 'aria-atomic' },
      { label: 'aria-autocomplete' },
      { label: 'aria-busy' },
      { label: 'aria-checked' },
      { label: 'aria-colcount' },
      { label: 'aria-colindex' },
      { label: 'aria-colspan' },
      { label: 'aria-controls' },
      { label: 'aria-current' },
      { label: 'aria-describedat' },
      { label: 'aria-describedby' },
      { label: 'aria-disabled' },
      { label: 'aria-dropeffect' },
      { label: 'aria-errormessage' },
      { label: 'aria-expanded' },
      { label: 'aria-flowto' },
      { label: 'aria-grabbed' },
      { label: 'aria-haspopup' },
      { label: 'aria-hidden' },
      { label: 'aria-invalid' },
      { label: 'aria-kbdshortcuts' },
      { label: 'aria-label' },
      { label: 'aria-labelledby' },
      { label: 'aria-level' },
      { label: 'aria-live' },
      { label: 'aria-modal' },
      { label: 'aria-multiline' },
      { label: 'aria-multiselectable' },
      { label: 'aria-orientation' },
      { label: 'aria-owns' },
      { label: 'aria-placeholder' },
      { label: 'aria-posinset' },
      { label: 'aria-pressed' },
      { label: 'aria-readonly' },
      { label: 'aria-relevant' },
      { label: 'aria-required' },
      { label: 'aria-roledescription' },
      { label: 'aria-rowcount' },
      { label: 'aria-rowindex' },
      { label: 'aria-rowspan' },
      { label: 'aria-selected' },
      { label: 'aria-setsize' },
      { label: 'aria-sort' },
      { label: 'aria-valuemax' },
      { label: 'aria-valuemin' },
      { label: 'aria-valuenow' },
      { label: 'aria-valuetext' }
    ];
    run([
      testCompletionFor('<div |> </div >', { items: expectedAriaAttributes }),
      testCompletionFor('<span  |> </span >', { items: expectedAriaAttributes }),
      testCompletionFor('<input  |> </input >', { items: expectedAriaAttributes })
    ], testDone);
  });

  test('Settings', function (testDone): any {
    run([
      testCompletionFor('<|', {
        items: [
          { label: 'div', notAvailable: true },
        ]
      }, { html5: false, ionic: true, angular1: false }),
      testCompletionFor('<|', {
        items: [
          { label: 'div' },
          { label: 'component' },
        ]
      }, { html5: true, ionic: false, angular1: false }),
      testCompletionFor('<input  |> </input >', {
        items: [
          { label: 'v-if' },
          { label: 'type' },
        ]
      }, { html5: true, ionic: false, angular1: false }),
    ], testDone);
  });
})
