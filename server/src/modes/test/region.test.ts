import * as assert from 'assert';
import { TextDocument, Range } from 'vscode-languageserver-types';
import { getDocumentRegions } from '../embeddedSupport';

const defaultTemplate =`
<div class="example">{{ msg }}</div>
`;

const defaultScript = `
export default {
  data () {
    return {
      msg: 'Hello world!'
    }
  }
}`;

const defaultStyle = `
.example {
  color: red;
}
`;

function getAllRegions(content: string) {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, content);
  const startPos = doc.positionAt(0);
  const endPos = doc.positionAt(content.length);
  return getDocumentRegions(doc).getLanguageRanges(Range.create(startPos, endPos));
}

function genAttr(lang: string) {
  return lang ? ` lang="${lang}"` : '';
}

function testcase(description: string) {
  let template = defaultTemplate;
  let script = defaultScript;
  let style = defaultStyle;

  let templateLang = '';
  let scriptLang = '';
  let styleLang = '';

  return {
    template(str: string, lang = '') {
      template = str;
      templateLang = lang;
      return this;
    },
    style(str: string, lang = '') {
      style = str;
      styleLang = lang;
      return this;
    },
    script(str: string, lang = '') {
      script = str;
      scriptLang = lang;
      return this;
    },
    run() {
      const content = `
<template${genAttr(templateLang)}>
${template}
</template>
<script${genAttr(scriptLang)}>
${script}
</script>
<style${genAttr(styleLang)}>
${style}
</style>
`
      test(description, () => {
        const regions = getAllRegions(content);
        assert(regions.length === 7);
        assert(regions[0].languageId === 'vue');
        assert(regions[1].languageId === 'vue-html');
        assert(regions[2].languageId === 'vue');
        assert(regions[3].languageId === 'javascript');
        assert(regions[4].languageId === 'vue');
        assert(regions[5].languageId === 'css');
        assert(regions[6].languageId === 'vue');
      });
    }
  }
}



suite('Embedded Support', () => {

  testcase('basic')
    .run();

  testcase('nested template')
    .template(`<div><template></template></div>`)
    .run();

  // testcase('ill formed template')
  //   .template(`<div><template> <span </template></div>`)
  //   .run();
});
