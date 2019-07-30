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
    const endOffsets = [...node.mergedNodes, node].reduce((acc, node) => {
      acc.add(node.from.end);
      return acc;
    }, new Set<number>());

    for (const fromIndex in node.offsetMapping) {
      // Only map from [start, end)
      if (!endOffsets.has(parseInt(fromIndex, 10))) {
        const toIndex = node.offsetMapping[fromIndex];
        const fromChar = templateSrc[fromIndex];
        const toChar = validSourceFile.getFullText()[toIndex];

        let errorMsg = `Pos ${fromIndex}: "${fromChar}" doesn't map to ${toIndex}: "${toChar}"\n`;

        errorMsg += `${templateSrc.slice(
          node.from.start,
          node.from.end
        )} should map to ${validSourceFile.getFullText().slice(node.to.start, node.to.end)}`;

        if (fromChar === `'` || fromChar === `"`) {
          // Single/double quotes are lost during transformation
          assert.ok([`'`, `"`].includes(toChar), errorMsg);
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
    if (file.endsWith('.vue')) {
      const filePath = path.resolve(fixturePath, file);
      test(`Source Map generation for ${path.relative(repoRootPath, filePath)}`, () => {
        filePathToTest(filePath);
      });
    }
  });
});
