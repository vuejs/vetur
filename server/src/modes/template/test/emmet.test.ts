import { CompletionTestSetup, testDSL } from '../../test-util/completion-test-util';

import { parseHTMLDocument } from '../parser/htmlParser';
import { doComplete } from '../services/htmlCompletion';

const setup: CompletionTestSetup = {
  langId: 'vue-html',
  docUri: 'test://test/test.html',
  doComplete(doc, pos) {
    const htmlDoc = parseHTMLDocument(doc);
    return doComplete(doc, pos, htmlDoc, [], {});
  }
};

const vueHtml = testDSL(setup);

suite('Emmet Completion', () => {
  test('Emmet HTML Expansion', () => {
    vueHtml`ul>li*3|`.has(`ul>li*3`).become(
      `<ul>
\t<li>\${1}</li>
\t<li>\${2}</li>
\t<li>\${0}</li>
</ul>`
    );

    vueHtml`{{ul>li*3|}}`.hasNo(`ul>li*3`);

    vueHtml`div+p|`.has(`div+p`).become(
      `<div>\${1}</div>
<p>\${0}</p>`
    );
  });

  vueHtml`#header|`.has(`#header`).become(`<div id="header">\${0}</div>`);
});
