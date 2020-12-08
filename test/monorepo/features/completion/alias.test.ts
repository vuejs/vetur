import { position } from '../../../util';
import { testCompletion } from '../../../completionHelper';
import { getDocUri } from '../../path';

describe('Should autocomplete for <script>', () => {
  const docUrl = getDocUri('packages/vue2/completion/Alias.vue');

  it('completes alias path when importing', async () => {
    await testCompletion(docUrl, position(1, 26), ['AppSpinner']);
  });
});
