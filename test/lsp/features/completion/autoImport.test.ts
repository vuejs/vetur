import { testCompletion, testCompletionResolve } from '../../../completionHelper';
import { position, sameLineRange, textEdit } from '../../../util';
import { getDocUri } from '../../path';

describe('Should import vue component to script in template', () => {
  it('completes components', async () => {
    await testCompletion(getDocUri('completion/autoImport/defineInOneLine.vue'), position(3, 9), [
      'two-stylus',
      'two-stylus-expected'
    ]);
  });

  /**
   * I can't get completion/resolve result in VSCode. =_=
   * https://github.com/microsoft/vscode/issues/110182
   */
  it.skip('Should do auto import when have components define in one line', async () => {
    await testCompletionResolve(
      getDocUri('completion/autoImport/defineInOneLine.vue'),
      position(3, 9),
      [
        {
          label: 'two-stylus',
          additionalTextEdits: [
            textEdit(sameLineRange(9, 0, 0), "import TwoStylus from '../../formatting/TwoStylus.vue'\n"),
            textEdit(sameLineRange(10, 20, 20), ', TwoStylus')
          ]
        },
        {
          label: 'two-stylus-expected',
          additionalTextEdits: [
            textEdit(
              sameLineRange(9, 0, 0),
              "import TwoStylusExpected from '../../formatting/TwoStylus.Expected.vue'\n"
            ),
            textEdit(sameLineRange(10, 20, 20), ', TwoStylusExpected')
          ]
        }
      ],
      2
    );
  });
});
