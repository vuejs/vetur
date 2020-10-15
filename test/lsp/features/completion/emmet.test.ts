import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should do emmet in template region', () => {
  const basicUri = getDocUri('completion/template/Emmet.vue');

  it('Should do emmet right after {{ }}', async () => {
    await testCompletion(basicUri, position(3, 5), [
      {
        label: 'p',
        detail: 'Emmet Abbreviation',
        documentationStart: '<p>|</p>'
      }
    ]);
  });

  it('Should do emmet inside style="|"', async () => {
    await testCompletion(basicUri, position(1, 15), [
      {
        label: 'padding: ;',
        detail: 'Emmet Abbreviation',
        documentationStart: 'padding: |;'
      }
    ]);
  });
});
