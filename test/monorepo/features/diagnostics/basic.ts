import { testNoDiagnostics } from '../../../diagnosticHelper';
import { getDocUri } from '../../path';

describe('Should find diagnostics.', () => {
  it(`Shows no diagnostics error for (path alias/import json)`, async () => {
    const docUri = getDocUri(`packages/vue3/src/components/AppButton.vue`);
    await testNoDiagnostics(docUri);
  });
});
