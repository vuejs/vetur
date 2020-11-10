import { parse } from 'vue-eslint-parser';
import ts from 'typescript';
import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { getTemplateTransformFunctions } from '../transformTemplate';
import { injectVueTemplate, parseVueTemplate } from '../preprocess';
import { generateSourceMap } from '../sourceMap';
import { trim } from 'lodash';

const printer = ts.createPrinter();

function processVueTemplate(templateCode: string) {
  const syntheticSourceFileName = 'synthetic.ts';
  const validSourceFileName = 'valid.ts';

  const program = parse(templateCode, { sourceType: 'module' });

  const syntheticSourceFile = ts.createSourceFile(
    syntheticSourceFileName,
    '',
    ts.ScriptTarget.ES5,
    false,
    ts.ScriptKind.JS
  );
  let expressions: ts.Expression[] = [];
  try {
    expressions = getTemplateTransformFunctions(ts).transformTemplate(program, templateCode);
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

  return {
    validSourceFile,
    sourceMapNodes
  };
}

function filePathToTest(filePath: string) {
  const vueFileSrc = fs.readFileSync(filePath, 'utf-8');
  const templateSrc = parseVueTemplate(vueFileSrc);
  const { sourceMapNodes, validSourceFile } = processVueTemplate(templateSrc);

  sourceMapNodes
    .filter(node => templateSrc.slice(node.from.start, node.from.end) === 'props')
    .forEach(node => {
      const endOffsets = [...node.mergedNodes, node].reduce((acc, node) => {
        acc.add(node.from.end);
        return acc;
      }, new Set<number>());

      const fromSrc = templateSrc.slice(node.from.start, node.from.end);
      const targetSrc = validSourceFile.getFullText().slice(node.to.start, node.to.end);

      /**
       * For back mapping from `"foo"` to `foo`, the last two
       */
      if (fromSrc.length === targetSrc.length - 2 && fromSrc === trim(targetSrc, `'"`)) {
        return;
      }

      for (const fromIndex in node.offsetMapping) {
        // Only map from [start, end)
        if (!endOffsets.has(parseInt(fromIndex, 10))) {
          const toIndex = node.offsetMapping[fromIndex];
          const fromChar = templateSrc[fromIndex];
          const toChar = validSourceFile.getFullText()[toIndex];

          let errorMsg = `Pos ${fromIndex}: "${fromChar}" doesn't map to ${toIndex}: "${toChar}"\n`;

          errorMsg += `${fromSrc} should map to ${targetSrc}`;

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

interface ExpectedMapping {
  fromStart: number;
  fromEnd: number;
  toCode: string;
}

function testTemplateMapping(code: string, expectedList: ExpectedMapping[]) {
  const { sourceMapNodes, validSourceFile } = processVueTemplate(code);

  const actualList = sourceMapNodes
    .map(node => {
      return {
        fromStart: node.from.start,
        fromEnd: node.from.end,
        toCode: validSourceFile.getFullText().slice(node.to.start, node.to.end)
      };
    })
    .sort((a, b) => {
      return a.fromStart - b.fromStart;
    })
    /**
     * For now, filter out `props` source node
     */
    .filter(node => {
      return node.toCode !== 'props';
    });

  const sortedExpectedList = expectedList.sort((a, b) => {
    return a.fromStart - b.fromStart;
  });

  assert.equal(actualList.length, expectedList.length);

  sortedExpectedList.forEach((expected, i) => {
    const actual = actualList[i];
    assert.deepEqual(actual, expected);
  });
}

suite('Source Map generation', () => {
  suite('Diagnostics fixtures', () => {
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

  suite('Individual mappings', () => {
    test('regular text interpolation', () => {
      testTemplateMapping(`<template>{{ a.b.c }}</template>`, [
        {
          fromStart: 13,
          fromEnd: 18,
          toCode: 'this.a.b.c'
        }
      ]);
    });

    test('text interpolation having an invalid expression', () => {
      testTemplateMapping(`<template>{{ a. }}</template>`, [
        {
          fromStart: 13,
          fromEnd: 15,
          toCode: 'this.a.'
        }
      ]);
    });

    test('text interpolation of an empty expression', () => {
      testTemplateMapping(`<template>{{ }}</template>`, [
        {
          fromStart: 12,
          fromEnd: 12,
          toCode: 'this.'
        }
      ]);
    });

    test('directive value of an empty expression', () => {
      testTemplateMapping(`<template><div :title="" /></template>`, [
        {
          fromStart: 16,
          fromEnd: 21,
          toCode: '"title"'
        },
        {
          fromStart: 23,
          fromEnd: 23,
          toCode: 'this.'
        }
      ]);
    });

    test('dynamic directive key of an empty expression', () => {
      testTemplateMapping(`<template><div :[] /></template>`, [
        {
          fromStart: 17,
          fromEnd: 17,
          toCode: 'this.'
        }
      ]);
    });
  });
});
