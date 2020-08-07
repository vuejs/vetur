import { showFile } from '../../../editorHelper';
import { getDocUri } from '../../path';
import { sleep } from '../../../util';

before(async () => {
  const docUri = getDocUri('beforeAll.vue');
  await showFile(docUri);
  await sleep(3000);
});
