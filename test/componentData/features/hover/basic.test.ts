import { testHover } from '../../../hoverHelper';
import { position, sameLineRange } from '../../../util';
import { getDocUri } from '../../path';

describe('Should show hover info with component data', () => {
  const docUri = getDocUri('hover/Element.vue');

  it('shows element description', async () => {
    await testHover(docUri, position(2, 5), {
      contents: [
        '```ts\n(property) __vlsComponentData<Record<string, any>>.props: Record<string, any>\n```\nA foo tag'
      ],
      range: sameLineRange(2, 5, 12)
    });
  });

  it('shows attribute description for non-dynamic attribute', async () => {
    await testHover(docUri, position(2, 15), {
      contents: ['An foo-attr description'],
      range: sameLineRange(2, 13, 21)
    });
  });

  it('shows attribute description for dynamic attribute with template interpolation enabled', async () => {
    await testHover(docUri, position(3, 15), {
      contents: ['```ts\n(property) "foo-attr": string\n```\nAn foo-attr description'],
      range: sameLineRange(3, 14, 22)
    });
  });
});
