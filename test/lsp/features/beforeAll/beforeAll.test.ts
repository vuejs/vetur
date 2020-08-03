import { getDocUri } from '../../util';
import { showFile, sleep } from '../../helper';

before(async () => {
  const docUri = getDocUri('beforeAll.vue');
  await showFile(docUri);
  await sleep(3000);
});
