import { getDocUri, testFormat } from '../helper';

describe('Should format', () => {
  const docUri = getDocUri('client/views/Home.vue');
  const expectedDocUri = getDocUri('client/views/Home.expected.vue');

  it('formats', async () => {
    await testFormat(docUri, expectedDocUri);
  });
});
