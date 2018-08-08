import { getDocUri, testFormat, activateLS } from '../helper';

describe('Should format', () => {
  before('activate', () => activateLS());

  const docUri = getDocUri('client/views/Home.vue');
  const expectedDocUri = getDocUri('client/views/Home.expected.vue');

  it('formats', async () => {
    await testFormat(docUri, expectedDocUri);
  });
});
