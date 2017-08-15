import * as assert from 'assert';
import * as path from 'path';
import * as glob from 'glob';
import * as fs from 'fs';
import { TextDocument } from 'vscode-languageserver-types';
import Uri from 'vscode-uri';

import { getVls } from './index';

const vls = getVls();

const workspace = path.resolve(__dirname, '../../test/fixtures/');
vls.initialize(workspace);

suite('integrated test', () => {
  test('validation', done => {
    glob(workspace + '/**/*.vue', (err, filenames) => {
      if (err) {
        assert(false, 'error occured!' + err.toString());
      }
      for (const filename of filenames) {
        const doc = createTextDocument(filename);
        const diagnostics = vls.validate(doc);
        assert(diagnostics.length === 0);
      }
      done();
    });
  });
});

function createTextDocument(filename: string): TextDocument {
  const uri = Uri.file(filename).toString();
  const content = fs.readFileSync(filename, 'utf-8');
  return TextDocument.create(uri, 'vue', 0, content);
}
