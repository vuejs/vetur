import { testHover } from '../../../hoverHelper';
import { position, sameLineRange } from '../../../util';
import { getDocUri } from '../../path';

describe('Should do hover', () => {
  const docUri = getDocUri('hover/Basic.vue');

  it('shows hover for <img> tag', async () => {
    await testHover(docUri, position(4, 7), {
      contents: ['An img element represents an image.'],
      range: sameLineRange(4, 7, 10)
    });
  });

  it('shows hover for this.msg', async () => {
    await testHover(docUri, position(33, 23), {
      contents: ['\n```ts\n(property) msg: string\n```\n'],
      range: sameLineRange(33, 23, 26)
    });
  });

  it('shows hover for `width` in <style>', async () => {
    const hoverText = `
Specifies the width of the content area, padding area or border area \\(depending on 'box\\-sizing'\\) of certain boxes\\.

Syntax: &lt;viewport\\-length&gt;\\{1,2\\}

[MDN Reference](https://developer.mozilla.org/docs/Web/CSS/width)
`.trim();

    await testHover(docUri, position(47, 3), {
      contents: [hoverText],
      range: sameLineRange(47, 2, 14)
    });
  });
});
