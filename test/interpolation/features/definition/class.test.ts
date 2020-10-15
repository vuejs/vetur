import { position, sameLineLocation } from '../../../util';
import { getDocUri } from '../../path';
import { testDefinition } from '../../../definitionHelper';

describe('Should find definition for vue-class-component components', () => {
  const parentUri = getDocUri('definition/classComponent/Parent.vue');

  it('finds definition for opening tag in <child></child>', async () => {
    const tagUri = getDocUri('definition/classComponent/Child.vue');
    await testDefinition(parentUri, position(2, 5), sameLineLocation(tagUri, 0, 0, 0));
  });

  it('finds definition for closing tag in <child></child>', async () => {
    const tagUri = getDocUri('definition/classComponent/Child.vue');
    await testDefinition(parentUri, position(2, 13), sameLineLocation(tagUri, 0, 0, 0));
  });

  it('finds definition for self-closing tag <child />', async () => {
    const tagUri = getDocUri('definition/classComponent/Child.vue');
    await testDefinition(parentUri, position(3, 5), sameLineLocation(tagUri, 0, 0, 0));
  });
});
