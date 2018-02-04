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
  test('validate: comp3.vue', () => {
    const filename = path.join(workspace + '/component/comp3.vue');
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doTemplateValidation(doc);
    assert.equal(diagnostics.length, 1, 'diagnostic count');
    assert.deepEqual(diagnostics[0].range, {
      start: { line: 1, character: 8 },
      end: { line: 1, character: 16 }
    });
    assert(/Property 'messaage' does not exist/.test(diagnostics[0].message), 'diagnostic message');
  });

  test('validate: comp4.vue', () => {
    const filename = path.join(workspace + '/component/comp4.vue');
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doTemplateValidation(doc);
    assert.equal(diagnostics.length, 0, 'diagnostic count');
  });
});
