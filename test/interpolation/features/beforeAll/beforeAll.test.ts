import { sleep } from '../../../util';
import { showFile } from '../../../editorHelper';
import { getDocUri } from '../../path';

before(async () => {
  const docUri = getDocUri('beforeAll.vue');
  await showFile(docUri);
  await sleep(3000);
});
