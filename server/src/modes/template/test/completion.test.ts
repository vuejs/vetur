/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { CompletionConfiguration } from '../tagProviders';

import { CompletionTestSetup, testDSL, CompletionAsserter } from '../../test-util/completion-test-util';

import { parseHTMLDocument } from '../parser/htmlParser';
import { doComplete } from '../services/htmlCompletion';
import { allTagProviders, getEnabledTagProviders } from '../tagProviders';

const setup: CompletionTestSetup = {
  langId: 'vue-html',
  docUri: 'test://test/test.html',
  doComplete(doc, pos) {
    const htmlDoc = parseHTMLDocument(doc);
    return doComplete(doc, pos, htmlDoc, allTagProviders, {});
  }
};

const html = testDSL(setup);

suite('HTML Completion', () => {
  test('Complete Start Tag', () => {
    html`<|`
      .has('iframe')
      .become('<iframe')
      .has('h1')
      .become('<h1')
      .has('div')
      .become('<div');

    html`< |`
      .has('iframe')
      .become('<iframe')
      .has('h1')
      .become('<h1')
      .has('div')
      .become('<div');

    html`<h|`
      .has('html')
      .become('<html')
      .has('h1')
      .become('<h1')
      .has('header')
      .become('<header');

    html`<input|`.has('input').become('<input');

    html`<inp|ut`.has('input').become('<input');

    html`<|inp`.has('input').become('<input');
  });

  test('Complete Attribute', () => {
    html`<input |`
      .has('type')
      .become('<input type="$1"')
      .has('style')
      .become('<input style="$1"')
      .hasNo('onmousemove');

    html`<input t|`
      .has('type')
      .become('<input type="$1"')
      .has('tabindex')
      .become('<input tabindex="$1"');

    html`<input t|ype`
      .has('type')
      .become('<input type="$1"')
      .has('tabindex')
      .become('<input tabindex="$1"');

    html`<input t|ype="text"`
      .has('type')
      .become('<input type="text"')
      .has('tabindex')
      .become('<input tabindex="text"');

    html`<input type="text" |`
      .has('style')
      .become('<input type="text" style="$1"')
      .has('type')
      .become('<input type="text" type="$1"')
      .has('size')
      .become('<input type="text" size="$1"');

    html`<input type="text" s|`
      .has('style')
      .become('<input type="text" style="$1"')
      .has('type')
      .become('<input type="text" type="$1"')
      .has('size')
      .become('<input type="text" size="$1"');

    html`<input di| type="text"`
      .has('disabled')
      .become('<input disabled type="text"')
      .has('dir')
      .become('<input dir="$1" type="text"');

    html`<input disabled | type="text"`
      .has('dir')
      .become('<input disabled dir="$1" type="text"')
      .has('style')
      .become('<input disabled style="$1" type="text"');

    html`<input :di|`.has('dir').become('<input :dir="$1"');

    html`<input :di| type="text"`.has('dir').become('<input :dir="$1" type="text"');

    html`<input @|`.has('mousemove').become('<input @mousemove="$1"');
  });

  test('Complete Value', () => {
    html`<input type=|`
      .has('text')
      .become('<input type="text"')
      .has('checkbox')
      .become('<input type="checkbox"');

    html`<input type="c|`
      .has('color')
      .become('<input type="color')
      .has('checkbox')
      .become('<input type="checkbox');

    html`<input type="|`
      .has('color')
      .become('<input type="color')
      .has('checkbox')
      .become('<input type="checkbox');

    html`<input type= |`
      .has('color')
      .become('<input type= "color"')
      .has('checkbox')
      .become('<input type= "checkbox"');

    html`<input src="c" type="color|" `.has('color').become('<input src="c" type="color" ');

    html`<iframe sandbox="allow-forms |`.has('allow-modals').become('<iframe sandbox="allow-forms allow-modals');

    html`<iframe sandbox="allow-forms allow-modals|`
      .has('allow-modals')
      .become('<iframe sandbox="allow-forms allow-modals');

    html`<iframe sandbox="allow-forms all|"`.has('allow-modals').become('<iframe sandbox="allow-forms allow-modals"');

    html`<iframe sandbox="allow-forms a|llow-modals "`
      .has('allow-modals')
      .become('<iframe sandbox="allow-forms allow-modals "');

    html`<input src="c" type=color| `.has('color').become('<input src="c" type="color" ');

    html`<div dir=|></div>`
      .has('ltr')
      .become('<div dir="ltr"></div>')
      .has('rtl')
      .become('<div dir="rtl"></div>');
  });

  test('Complete End Tag', () => {
    html`<ul><|>`
      .has('/ul')
      .become('<ul></ul>')
      .has('li')
      .become('<ul><li>');

    html`<ul><li><|`
      .has('/li')
      .become('<ul><li></li>')
      .has('a')
      .become('<ul><li><a');

    html`<goo></|>`.has('/goo').become('<goo></goo>');

    html`<foo></f|`.has('/foo').become('<foo></foo>');

    html`<foo></f|o`.has('/foo').become('<foo></foo>');

    html`<foo></|fo`.has('/foo').become('<foo></foo>');

    html`<foo></ |>`.has('/foo').become('<foo></foo>');

    html`<span></ s|`.has('/span').become('<span></span>');

    html`<li><br></ |>`.has('/li').become('<li><br></li>');

    html`<li/|>`.count(0);
    html`  <div/|   `.count(0);
    html`<li><br/|>`.count(0);

    html`<foo><br/></ f|>`.has('/foo').become('<foo><br/></foo>');
    html`<li><div/></|`.has('/li').become('<li><div/></li>');

    html`<foo><bar></bar></|   `.has('/foo').become('<foo><bar></bar></foo>   ');

    html`
    <div>
      <form>
        <div>
          <label></label>
          <|
        </div>
      </form></div>`
      .has('span')
      .become(
        `
    <div>
      <form>
        <div>
          <label></label>
          <span
        </div>
      </form></div>`
      )
      .has('/div').become(`
    <div>
      <form>
        <div>
          <label></label>
        </div>
        </div>
      </form></div>`);

    html`<body><div><div></div></div></|  >`.has('/body').become('<body><div><div></div></div></body  >');

    html`
    <body>
      <div>
        </|`.has('/div').become(`
    <body>
      <div>
      </div>`);
  });

  test('Complete interpolation', () => {
    html`{{|}}`
      .hasNo('div');
    html`{{d|}}`
      .hasNo('div');
    html`<div>{{d|}}</div>`
      .hasNo('div');
    html`<div>{{d|`
      .hasNo('div');
    html`<div>{{d}}</|`
      .has('/div')
      .become('<div>{{d}}</div>');
  });

  test('Vue complete', function () {
    html`<transition type=|></transition>`
      .has('transition')
      .become('<transition type="transition"></transition>')
      .has('animation')
      .become('<transition type="animation"></transition>');
  });

  test('Case sensitivity', function () {
    html`<LI></|`
      .has('/LI')
      .become('<LI></LI>')
      .hasNo('/li');

    html`<lI></|`.has('/lI').become('<lI></lI>');

    html`<iNpUt |`.has('type').become('<iNpUt type="$1"');

    html`<INPUT TYPE=|`.has('color').become('<INPUT TYPE="color"');
  });

  test('Handlebar Completion', function () {
    html`<script id="entry-template" type="text/x-handlebars-template"> <| </script>`
      .has('div')
      .become('<script id="entry-template" type="text/x-handlebars-template"> <div </script>');
  });

  test('Complete aria', function () {
    function expectAria(asserter: CompletionAsserter) {
      asserter
        .has('aria-activedescendant')
        .has('aria-atomic')
        .has('aria-autocomplete')
        .has('aria-busy')
        .has('aria-checked')
        .has('aria-colcount')
        .has('aria-colindex')
        .has('aria-colspan')
        .has('aria-controls')
        .has('aria-current')
        .has('aria-describedat')
        .has('aria-describedby')
        .has('aria-disabled')
        .has('aria-dropeffect')
        .has('aria-errormessage')
        .has('aria-expanded')
        .has('aria-flowto')
        .has('aria-grabbed')
        .has('aria-haspopup')
        .has('aria-hidden')
        .has('aria-invalid')
        .has('aria-kbdshortcuts')
        .has('aria-label')
        .has('aria-labelledby')
        .has('aria-level')
        .has('aria-live')
        .has('aria-modal')
        .has('aria-multiline')
        .has('aria-multiselectable')
        .has('aria-orientation')
        .has('aria-owns')
        .has('aria-placeholder')
        .has('aria-posinset')
        .has('aria-pressed')
        .has('aria-readonly')
        .has('aria-relevant')
        .has('aria-required')
        .has('aria-roledescription')
        .has('aria-rowcount')
        .has('aria-rowindex')
        .has('aria-rowspan')
        .has('aria-selected')
        .has('aria-setsize')
        .has('aria-sort')
        .has('aria-valuemax')
        .has('aria-valuemin')
        .has('aria-valuenow')
        .has('aria-valuetext');
    }
    expectAria(html`<div |> </div >`);
    expectAria(html`<span  |> </span >`);
    expectAria(html`<input  |> </input >`);
  });

  test('Settings', function () {
    function configured(settings: CompletionConfiguration) {
      return testDSL({
        langId: 'vue-html',
        docUri: 'test://test/test.html',
        doComplete(doc, pos) {
          const htmlDoc = parseHTMLDocument(doc);
          const enabledTagProviders = getEnabledTagProviders(settings);
          return doComplete(doc, pos, htmlDoc, enabledTagProviders, {});
        }
      });
    }
    const noHTML = configured({ html5: false, element: true, router: false });
    noHTML`<|`
      .has('el-input')
      .withDoc('Input data using mouse or keyboard.')
      .hasNo('div');

    noHTML`<el-input |`
      .has('placeholder')
      .hasNo('text-color')
      .has('on-icon-click')
      .withDoc('hook function when clicking on the input icon')
      .has('auto-complete')
      .become('<el-input auto-complete="$1"');

    noHTML`<el-cascader expand-trigger=|`.has('click').has('hover');

    noHTML`<el-tooltip |`.has('content').withDoc('display content, can be overridden by slot#content');

    noHTML`<el-popover |`.has('content').withDoc('popover content, can be replaced with a default slot');

    const vueHTML = configured({ html5: true, element: false, router: false });
    vueHTML`<|`
      .has('div')
      .hasNo('el-row')
      .has('component');

    vueHTML`<input  |> </input >`.has('v-if').has('type');

    vueHTML`<li |`
      .has('v-else')
      .become('<li v-else')
      .has('v-pre')
      .become('<li v-pre')
      .has('v-cloak')
      .become('<li v-cloak')
      .has('v-once')
      .become('<li v-once');
  });
});
