import * as assert from 'assert';
import * as path from 'path';

import { getJavascriptMode } from '../javascript';
import { getLanguageModelCache } from '../../languageModelCache';
import { getDocumentRegions } from '../../embeddedSupport';
import { createTextDocument } from './script-integration';
import { Range } from 'vscode-languageserver';

const workspace = path.resolve(__dirname, '../../../../test/fixtures/');
const documentRegions = getLanguageModelCache(10, 60, document => getDocumentRegions(document));
const scriptMode = getJavascriptMode(documentRegions, workspace);

interface Expected {
  includes: string;
  range: Range;
}

function check(file: string, expected: Expected[]): void {
  const filename = path.join(workspace + '/component/template-checking/', file);
  const doc = createTextDocument(filename);
  const diagnostics = scriptMode.doTemplateValidation(doc);
  assert.equal(diagnostics.length, expected.length, 'diagnostic count');

  diagnostics.forEach((diag, i) => {
    const e = expected[i];
    assert(diag.message.includes(e.includes), 'diagnostic message - index: ' + i);
    assert.deepEqual(diag.range, e.range, 'diagnostic range of \'' + diag.message + '\'');
  });
}

suite('template integrated test', () => {
  test('validate: expression.vue', () => {
    check('expression.vue', [
      {
        includes: 'Property \'messaage\' does not exist',
        range: {
          start: { line: 1, character: 8 },
          end: { line: 1, character: 16 }
        }
      }
    ]);
  });

  test('validate: v-for.vue', () => {
    check('v-for.vue', [
      {
        includes: 'Property \'notExists\' does not exist',
        range: {
          start: { line: 5, character: 15 },
          end: { line: 5, character: 24 }
        }
      }
    ]);
  });

  test('validate: object-literal.vue', () => {
    check('object-literal.vue', [
      {
        includes: 'Property \'bar\' does not exist',
        range: {
          start: { line: 3, character: 9 },
          end: { line: 3, character: 12 }
        }
      }
    ]);
  });

  test('validate: v-on.vue', () => {
    check('v-on.vue', [
      {
        includes: 'Argument of type \'123\' is not assignable to parameter of type \'string\'',
        range: {
          start: { line: 9, character: 31 },
          end: { line: 9, character: 34 }
        }
      },
      {
        includes: 'Type \'"test"\' is not assignable to type \'number\'',
        range: {
          start: { line: 10, character: 20 },
          end: { line: 10, character: 24 }
        }
      }
    ]);
  });
});
