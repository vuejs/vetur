import { hoverDSL } from '../../../test-util/hover-test-util';

import { stylusHover } from '../stylus-hover';

const stylus = hoverDSL({
  langId: 'stylus',
  docUri: 'test://test/test.styl',
  doHover(doc, pos) {
    return stylusHover(doc, pos);
  }
});

suite('Stylus Hover', () => {
  test('property hover', () => {
    stylus`.test
  cu|rsor pointer`.hasHoverAt('Allows control over cursor appearance in an element', 9);

    stylus`.test
  cu|rsor: pointer`.hasHoverAt('Allows control over cursor appearance in an element', 9);

    stylus`.test
  |cursor: pointer`.hasHoverAt('Allows control over cursor appearance in an element', 9);

    stylus`.test
  cursor|: pointer`.hasHoverAt('Allows control over cursor appearance in an element', 9);

    stylus`.test
  cursor: p|ointer`.hasNothing();
  });
});
