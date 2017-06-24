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

function getAllRegions(doc: TextDocument) {
  const startPos = doc.positionAt(0);
  const endPos = doc.positionAt(doc.getText().length);
  return getDocumentRegions(doc).getLanguageRanges(Range.create(startPos, endPos));
}

function genAttr(lang: string) {
  return lang ? ` lang="${lang}"` : '';
}

function getLangId(block: string, lang: string) {
  const mapping: { [block: string]: string } = {
    template: 'vue-html',
    script: 'javascript',
    style: 'css'
  };
  return lang || mapping[block];
}

function testcase(description: string) {
  type Contents = { [block: string]: string | undefined }

  let contents: Contents = {
    template: defaultTemplate,
    script: defaultScript,
    style: defaultStyle
  };

  let langMap: { [block: string]: string } = {
    template: '',
    script: '',
    style: ''
  };

  function setBlock(block: string, str: string | undefined, lang = '') {
    contents[block] = str;
    langMap[block] = lang;
  }

  function activeBlocks() {
    return Object.keys(contents).filter(b => contents[b] !== undefined);
  }

  function generateContent() {
    let content = '';
    for (let block of activeBlocks()) {
      let startTag = block + genAttr(langMap[block]);
      content += `<${startTag}>` + '\n' + contents[block] + '\n' + `</${block}>` + '\n';
    }
    return content;
  }

  return {
    template(str: string | undefined, lang = '') {
      setBlock('template', str, lang);
      return this;
    },
    style(str: string | undefined, lang = '') {
      setBlock('style', str, lang);
      return this;
    },
    script(str: string | undefined, lang = '') {
      setBlock('script', str, lang);
      return this;
    },
    run() {
      let content = generateContent();
      let offset = content.indexOf('|');
      if (offset >= 0) {
        content = content.substr(0, offset) + content.substr(offset + 1);
      }
      const doc = TextDocument.create('test://test/test.vue', 'vue', 0, content);
      test(description, () => {
        const ranges = getAllRegions(doc);
        const blocks = activeBlocks();

        assert.equal(ranges.length, blocks.length * 2 + 1, 'block number mismatch');
        for (let i = 0, l = blocks.length; i < l; i++) {
          assert.equal(ranges[2 * i].languageId, 'vue', 'block separator mismatch');
          const langId = getLangId(blocks[i], langMap[blocks[i]])
          assert.equal(ranges[2 * i + 1].languageId, langId, 'block lang mismatch');
        }
        if (offset >= 0) {
          const pos = doc.positionAt(offset);
          const language = getDocumentRegions(doc).getLanguageAtPosition(pos);
          for (let block of blocks) {
            let content = contents[block];
            if (content && content.indexOf('|') >= 0) {
              assert.equal(language, getLangId(block, langMap[block]));
              return;
            }
          }
          assert(false, 'fail to match langauge id');
        }
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

  testcase('position')
    .template(`<div|></div>`)
    .run();

  testcase('empty block')
    .style(` `)
    .run();

  testcase('lang')
    .template(`.test`, 'pug')
    .style('. test { color: red}', 'sass')
    .run();

  // testcase('ill formed template')
  //   .template(`<div><template> <span </template></div>`)
  //   .run();
});
