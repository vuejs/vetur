import { TextDocument } from 'vscode-languageserver-types';
import * as assert from 'assert';
import { parseVueDocumentRegions } from '../vueDocumentRegionParser';
import { getEmbeddedDocument } from '../embeddedSupport';

const src = `
<template>
 
</template>
<script>
export default {
}
</script>
<style>
</style>
`;

suite('New Embedded Support', () => {
  test('Basic', () => {
    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, src));

    assert.equal(regions[0].languageId, 'vue-html');
    assert.equal(regions[1].languageId, 'javascript');
    assert.equal(regions[2].languageId, 'css');
  });

  test('Get Language Document', () => {
    const doc = TextDocument.create('test://test.vue', 'vue', 0, src);
    const { regions } = parseVueDocumentRegions(doc);

    const newDoc = getEmbeddedDocument(doc, regions, 'javascript');
    const jsSrc = `export default {
}`;
    assert.equal(doc.getText().length, newDoc.getText().length);
    assert.equal(newDoc.getText().trim(), jsSrc);
  });
});
