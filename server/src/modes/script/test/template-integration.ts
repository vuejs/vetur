import * as assert from 'assert';
import * as path from 'path';

import { getJavascriptMode } from '../javascript';
import { getLanguageModelCache } from '../../languageModelCache';
import { getDocumentRegions } from '../../embeddedSupport';
import { createTextDocument } from './script-integration';

const workspace = path.resolve(__dirname, '../../../../test/fixtures/');
const documentRegions = getLanguageModelCache(10, 60, document => getDocumentRegions(document));
const scriptMode = getJavascriptMode(documentRegions, workspace);

suite('template integrated test', () => {
  test('validate: expression.vue', () => {
    const filename = path.join(workspace + '/component/template-checking/expression.vue');
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doTemplateValidation(doc);
    assert.equal(diagnostics.length, 1, 'diagnostic count');
    assert.deepEqual(diagnostics[0].range, {
      start: { line: 1, character: 8 },
      end: { line: 1, character: 16 }
    });
    assert(/Property 'messaage' does not exist/.test(diagnostics[0].message), 'diagnostic message');
  });

  test('validate: v-for.vue', () => {
    const filename = path.join(workspace + '/component/template-checking/v-for.vue');
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doTemplateValidation(doc);
    assert.equal(diagnostics.length, 1, 'diagnostic count');
    assert(/Property 'notExists' does not exist/.test(diagnostics[0].message), 'diagnostic message');
  });

  test('validate: object-literal.vue', () => {
    const filename = path.join(workspace + '/component/template-checking/object-literal.vue');
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doTemplateValidation(doc);
    assert.equal(diagnostics.length, 1, 'diagnostic count');
    assert(/Property 'bar' does not exist/.test(diagnostics[0].message), 'diagnostic message');
  });

  test('validate: v-on.vue', () => {
    const filename = path.join(workspace + '/component/template-checking/v-on.vue');
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doTemplateValidation(doc);
    assert.equal(diagnostics.length, 3, 'diagnostic count');
    assert(/Argument of type 'Event' is not assignable to parameter of type 'string'/.test(diagnostics[0].message));
    assert(/Argument of type '123' is not assignable to parameter of type 'string'/.test(diagnostics[1].message));
    assert(/Type '"test"' is not assignable to type 'number'/.test(diagnostics[2].message));
  });
});
