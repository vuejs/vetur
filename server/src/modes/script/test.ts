import * as assert from 'assert';
import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';
import { TextDocument } from 'vscode-languageserver-types';
import Uri from 'vscode-uri';

import { getJavascriptMode } from './javascript';
import { getLanguageModelCache } from '../languageModelCache';
import { getDocumentRegions } from '../embeddedSupport';
import { ComponentInfo } from './findComponents';

const workspace = path.resolve(__dirname, '../../../test/fixtures/');
const documentRegions = getLanguageModelCache(10, 60, document => getDocumentRegions(document));
const scriptMode = getJavascriptMode(documentRegions, workspace);

suite('integrated test', () => {
  const filenames = glob.sync(workspace + '/**/*.vue');
  for (const filename of filenames) {
    const doc = createTextDocument(filename);
    const diagnostics = scriptMode.doValidation!(doc);
    test('validate: ' + path.basename(filename), () => {
      assert(diagnostics.length === 0);
    });
    if (filename.endsWith('app.vue')) {
      const components = scriptMode.findComponents(doc);
      test('props collection', testProps.bind(null, components));
    }
  }
});

function testProps(components: ComponentInfo[]) {
    assert.equal(components.length, 2, 'componet number');
    const comp = components[0];
    const comp2 = components[1];
    assert.equal(comp.name, 'Comp', 'componet name');
    assert.equal(comp2.name, 'Comp2', 'componet name');
    assert.deepEqual(comp.props, [{name: 'propname'}, {name: 'anotherProp'}]);
    assert.deepEqual(comp2.props, [
      {name: 'propname', doc: 'String'},
      {name: 'weirdProp', doc: ''},
      {name: 'anotherProp', doc: 'type: Number'},
    ]);
}

function createTextDocument(filename: string): TextDocument {
  const uri = Uri.file(filename).toString();
  const content = fs.readFileSync(filename, 'utf-8');
  return TextDocument.create(uri, 'vue', 0, content);
}
