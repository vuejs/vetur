import { TextDocument } from 'vscode-languageserver-textdocument';
import assert from 'assert';
import { parseVueDocumentRegions } from '../vueDocumentRegionParser';
import { getSingleLanguageDocument, getSingleTypeDocument, getLanguageRangesOfType } from '../embeddedSupport';

suite('New Embedded Support', () => {
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

suite('Double language blocks', () => {
  test('Basic', () => {
    const src = `
<template>

</template>

<style>
</style>

<style>
</style>
`;

    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, src));

    assert.equal(regions[0].languageId, 'vue-html');
    assert.equal(regions[1].languageId, 'css');
    assert.equal(regions[2].languageId, 'css');
  });

  test('Double scss', () => {
    const src = `
<template>

</template>

<style lang="scss">
</style>

<style lang="scss">
</style>
`;

    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, src));

    assert.equal(regions[0].languageId, 'vue-html');
    assert.equal(regions[1].languageId, 'scss');
    assert.equal(regions[2].languageId, 'scss');
  });

  test('Two langs for two styles block', () => {
    const src = `
<template>

</template>

<style lang="scss">
</style>

<style lang="stylus">
</style>
`;

    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, src));

    assert.equal(regions[0].languageId, 'vue-html');
    assert.equal(regions[1].languageId, 'scss');
    assert.equal(regions[2].languageId, 'stylus');
  });
});

suite('External Source', () => {
  const src = `
<template>

</template>

<script src="./external.js">
</script>
`;

  test('Get Script Src', () => {
    const { importedScripts } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, src));

    assert.equal(importedScripts[0], './external.js');
  });
});

suite('Template region positions', () => {
  const htmlSrc = `
<template>
  <p>Test</p>
</template>
`;

  test('vue-html region positions', () => {
    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, htmlSrc));

    assert.equal(regions[0].languageId, 'vue-html');
    assert.equal(
      htmlSrc.slice(regions[0].start, regions[0].end),
      [
        // prettier-ignore
        '',
        '  <p>Test</p>',
        ''
      ].join('\n')
    );
  });

  const pugSrc = `
<template lang="pug">
p Test
</template>
`;

  test('pug region positions', () => {
    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, pugSrc));

    assert.equal(regions[0].languageId, 'pug');
    assert.equal(
      pugSrc.slice(regions[0].start, regions[0].end),
      [
        // prettier-ignore
        '',
        'p Test',
        ''
      ].join('\n')
    );
  });
});

suite('Embedded <template> ', () => {
  const htmlSrc = `
<template>
  <template>
    <p>Test</p>
  </template>
</template>
`;
  test('vue-html region positions', () => {
    const { regions } = parseVueDocumentRegions(TextDocument.create('test://test.vue', 'vue', 0, htmlSrc));

    assert.equal(regions[0].languageId, 'vue-html');
    assert.equal(
      htmlSrc.slice(regions[0].start, regions[0].end),
      [
        // prettier-ignore
        '',
        '  <template>',
        '    <p>Test</p>',
        '  </template>',
        ''
      ].join('\n')
    );
  });
});
