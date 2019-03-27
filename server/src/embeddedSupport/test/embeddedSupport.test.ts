import { TextDocument } from 'vscode-languageserver-types';
import * as assert from 'assert';
import { parseVueDocumentRegions } from '../vueDocumentRegionParser';
import { getSingleLanguageDocument, getSingleTypeDocument, getLanguageRangesOfType } from '../embeddedSupport';

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

  test('Get Single Language Document', () => {
    const doc = TextDocument.create('test://test.vue', 'vue', 0, src);
    const { regions } = parseVueDocumentRegions(doc);

    const newDoc = getSingleLanguageDocument(doc, regions, 'javascript');
    const jsSrc = `export default {
}`;
    assert.equal(doc.getText().length, newDoc.getText().length);
    assert.equal(newDoc.getText().trim(), jsSrc);
  });

  test('Get Single RegionType Document', () => {
    const doc = TextDocument.create('test://test.vue', 'vue', 0, src);
    const { regions } = parseVueDocumentRegions(doc);

    const newDoc = getSingleTypeDocument(doc, regions, 'script');
    const jsSrc = `export default {
}`;
    assert.equal(doc.getText().length, newDoc.getText().length);
    assert.equal(newDoc.getText().trim(), jsSrc);
  });

  test('Get Ranges of Type', () => {
    const doc = TextDocument.create('test://test.vue', 'vue', 0, src);
    const { regions } = parseVueDocumentRegions(doc);

    const ranges = getLanguageRangesOfType(doc, regions, 'script');

    assert.equal(ranges.length, 1);
    assert.equal(ranges[0].languageId, 'javascript');
  });
});
