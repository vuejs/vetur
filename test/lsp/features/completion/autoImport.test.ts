import { testCompletion, testCompletionResolve } from '../../../completionHelper';
import { position, sameLineRange, textEdit } from '../../../util';
import { getDocUri } from '../../path';
import { EOL as NEW_LINE } from 'os';

describe('Should import vue component to script in template', () => {
  it('completes components', async () => {
    await testCompletion(getDocUri('completion/autoImport/defineInOneLine.vue'), position(3, 9), [
      'two-stylus',
      'two-stylus-expected'
    ]);
  });

  it('completes components when exist same component name', async () => {
    await testCompletion(
      getDocUri('completion/autoImport/sameComponentName.vue'),
      position(3, 5),
      [
        {
          label: 'child',
          documentationStart: 'child component description'
        },
        {
          label: 'child',
          documentationStart: '\n```typescript\nimport Child from'
        }
      ],
      ei => result => {
        if (typeof ei === 'string') {
          return ei === result.label;
        }
        if (ei.label === result.label) {
          if (typeof result.documentation === 'string' && ei.documentationStart) {
            return result.documentation.startsWith(ei.documentationStart);
          }
          if (typeof result.documentation === 'object' && ei.documentationStart) {
            return result.documentation.value.startsWith(ei.documentationStart);
          }
        }
        return false;
      }
    );
  });

  it('Should do auto import when have components define in one line', async () => {
    await testCompletionResolve(
      getDocUri('completion/autoImport/defineInOneLine.vue'),
      position(3, 9),
      [
        {
          label: 'two-stylus',
          additionalTextEdits: [
            textEdit(sameLineRange(8, 0, 0), `import TwoStylus from '../../formatting/TwoStylus.vue'${NEW_LINE}`),
            textEdit(sameLineRange(10, 20, 20), ', TwoStylus')
          ]
        },
        {
          label: 'two-stylus-expected',
          additionalTextEdits: [
            textEdit(
              sameLineRange(8, 0, 0),
              `import TwoStylusExpected from '../../formatting/TwoStylus.Expected.vue'${NEW_LINE}`
            ),
            textEdit(sameLineRange(10, 20, 20), ', TwoStylusExpected')
          ]
        }
      ],
      Number.MAX_VALUE
    );
  });

  it('Should do auto import when no define components', async () => {
    await testCompletionResolve(
      getDocUri('completion/autoImport/noDefineComponents.vue'),
      position(2, 5),
      [
        {
          label: 'child',
          additionalTextEdits: [
            textEdit(sameLineRange(7, 0, 0), `import Child from '../template/childComponent/Child.vue'${NEW_LINE}`),
            textEdit(sameLineRange(7, 16, 16), `${NEW_LINE}  components: { Child },`)
          ]
        }
      ],
      Number.MAX_VALUE
    );
  });

  it('Should do auto import when exist same component name', async () => {
    await testCompletionResolve(
      getDocUri('completion/autoImport/sameComponentName.vue'),
      position(3, 5),
      [
        {
          label: 'child',
          additionalTextEdits: [
            textEdit(
              sameLineRange(8, 0, 0),
              `import Child1 from '../../diagnostics/noScriptRegion/Child.vue'${NEW_LINE}`
            ),
            textEdit(sameLineRange(12, 9, 9), `,${NEW_LINE}    Child1`)
          ]
        }
      ],
      Number.MAX_VALUE,
      ei => result => {
        return ei.label === result.label && !!result.additionalTextEdits;
      }
    );
  });

  it('Should do auto import when special name', async () => {
    await testCompletionResolve(
      getDocUri('completion/autoImport/sameComponentName.vue'),
      position(3, 5),
      [
        {
          label: 'es-lint',
          additionalTextEdits: [
            textEdit(sameLineRange(8, 0, 0), `import ESLint from '../../diagnostics/ESLint.vue'${NEW_LINE}`),
            textEdit(sameLineRange(12, 9, 9), `,${NEW_LINE}    ESLint`)
          ]
        }
      ],
      Number.MAX_VALUE,
      ei => result => {
        return ei.label === result.label && !!result.additionalTextEdits;
      }
    );
  });

  it('Should do auto import when kebab case name', async () => {
    await testCompletionResolve(
      getDocUri('completion/autoImport/sameComponentName.vue'),
      position(3, 5),
      [
        {
          label: 'kebab-case',
          additionalTextEdits: [
            textEdit(sameLineRange(9, 0, 0), `import KebabCase from './kebab-case.vue'${NEW_LINE}`),
            textEdit(sameLineRange(12, 9, 9), `,${NEW_LINE}    KebabCase`)
          ]
        }
      ],
      Number.MAX_VALUE,
      ei => result => {
        return ei.label === result.label && !!result.additionalTextEdits;
      }
    );
  });
});
