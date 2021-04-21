import { testHover } from '../../../hoverHelper';
import { position, sameLineRange } from '../../../util';
import { getDocUri } from '../../path';

describe('Should do hover interpolation for <template>', () => {
  const docUri = getDocUri('hover/Basic.vue');

  it('shows hover for msg in mustache', async () => {
    await testHover(docUri, position(2, 11), {
      contents: ['```ts\n(property) msg: string\n```'],
      range: sameLineRange(2, 10, 13)
    });
  });

  it('shows hover for v-for variable', async () => {
    await testHover(docUri, position(5, 20), {
      contents: ['```ts\n(parameter) item: number\n```'],
      range: sameLineRange(5, 18, 22)
    });
  });

  it('shows hover for v-for variable on readonly array', async () => {
    await testHover(docUri, position(10, 20), {
      contents: ['```ts\n(parameter) item: string\n```'],
      range: sameLineRange(10, 18, 22)
    });
  });
});
