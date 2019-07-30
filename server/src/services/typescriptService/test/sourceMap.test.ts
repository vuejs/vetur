import { parse } from 'vue-eslint-parser';
import * as ts from 'typescript';
import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { getTemplateTransformFunctions } from '../transformTemplate';
import { injectVueTemplate, parseVueTemplate } from '../preprocess';
import { generateSourceMap } from '../sourceMap';

const printer = ts.createPrinter();

function filePathToTest(filePath: string) {
  const vueFileSrc = fs.readFileSync(filePath, 'utf-8');
  const templateSrc = parseVueTemplate(vueFileSrc);
  const syntheticSourceFileName = 'synthetic.ts';
  const validSourceFileName = 'valid.ts';

  const program = parse(templateSrc, { sourceType: 'module' });

  const syntheticSourceFile = ts.createSourceFile(
    syntheticSourceFileName,
    '',
    ts.ScriptTarget.ES5,
    false,
    ts.ScriptKind.JS
  );
  let expressions: ts.Expression[] = [];
  try {
    expressions = getTemplateTransformFunctions(ts).transformTemplate(program, templateSrc);
    injectVueTemplate(ts, syntheticSourceFile, expressions);
  } catch (err) {
    console.log(err);
  }

  const validSource = printer.printFile(syntheticSourceFile);

  const validSourceFile = ts.createSourceFile(
    validSourceFileName,
    validSource,
    syntheticSourceFile.languageVersion,
    true /* setParentNodes: Need this to walk the AST */,
    ts.ScriptKind.JS
  );

  const sourceMapNodes = generateSourceMap(ts, syntheticSourceFile, validSourceFile);

  sourceMapNodes.forEach(node => {
    for (const fromIndex in node.offsetMapping) {
      // Only map from [start, end)
      if (parseInt(fromIndex, 10) !== node.from.end) {
        const toIndex = node.offsetMapping[fromIndex];
        let errorMsg = `Pos ${fromIndex}: ${templateSrc[fromIndex]} doesn't map to ${toIndex}: ${
          validSourceFile.getFullText()[toIndex]
        }\n`;
        errorMsg += `${templateSrc.slice(
          node.from.start,
          node.from.end
        )} should map to ${validSourceFile.getFullText().slice(node.to.start, node.to.end)}`;

        const fromChar = templateSrc[fromIndex];
        const toChar = validSourceFile.getFullText()[toIndex];
        if (fromChar === `'` || fromChar === `"`) {
          // Single/double quotes are lost during transformation
          assert.ok([`'`, `"`].includes(toChar), errorMsg);
        } else if (/^\s$/.test(fromChar)) {
          // Whitespace can be converted another kind of whitespace
          assert.ok(/^\s$/.test(toChar), errorMsg);
        } else {
          assert.equal(fromChar, toChar, errorMsg);
        }
      }
    }
  });
}

suite('Source Map generation', () => {
  const repoRootPath = path.resolve(__dirname, '../../../../..');
  const fixturePath = path.resolve(__dirname, repoRootPath, './test/interpolation/fixture/diagnostics');

  fs.readdirSync(fixturePath).forEach(file => {
    // FIXME: temporary skip a few tests
    if (file === 'trivia.vue') {
      return;
    }
    if (file.endsWith('.vue')) {
      const filePath = path.resolve(fixturePath, file);
      test(`Source Map generation for ${path.relative(repoRootPath, filePath)}`, () => {
        filePathToTest(filePath);
      });
    }
  });
});
