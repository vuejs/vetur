import assert from 'assert';
import path from 'path';
import ts from 'typescript';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { getDefaultVLSConfig } from '../../../config';
import { getVueDocumentRegions } from '../../../embeddedSupport/embeddedSupport';
import { LanguageModelCache } from '../../../embeddedSupport/languageModelCache';
import { createEnvironmentService } from '../../EnvironmentService';
import { getServiceHost } from '../serviceHost';

suite('serviceHost', () => {
  suite('interpolation performance', () => {
    const repoRootPath = path.resolve(__dirname, '../../../../..');
    const fixturePath = path.resolve(__dirname, repoRootPath, './test/interpolation/fixture');

    function setup() {
      const scriptRegionDocuments: LanguageModelCache<TextDocument> = {
        refreshAndGet(doc) {
          return getVueDocumentRegions(doc).getSingleTypeDocument('script');
        },
        onDocumentRemoved() {},
        dispose() {}
      };
      const serviceHost = getServiceHost(
        ts,
        createEnvironmentService(
          fixturePath,
          fixturePath,
          fixturePath,
          path.join(fixturePath, 'package.json'),
          fixturePath,
          [],
          getDefaultVLSConfig()
        ),
        scriptRegionDocuments
      );

      const filePath = path.join(fixturePath, 'DoNotMatter.vue');
      const doc = TextDocument.create(URI.file(filePath).toString(), 'vue', 0, '');

      return { serviceHost, doc };
    }
    test('reuse type checker', () => {
      const { serviceHost, doc } = setup();

      const firstTypeChecker = serviceHost.updateCurrentVueTextDocument(doc).service.getProgram()?.getTypeChecker();

      const secondTypeChecker = serviceHost.updateCurrentVueTextDocument(doc).service.getProgram()?.getTypeChecker();

      assert.strictEqual(firstTypeChecker, secondTypeChecker);
    }).timeout(4000);
    test('reuse type checker', () => {
      const { serviceHost, doc } = setup();

      const firstTypeChecker = serviceHost
        .updateCurrentVirtualVueTextDocument(doc)
        .templateService.getProgram()
        ?.getTypeChecker();

      const secondTypeChecker = serviceHost
        .updateCurrentVirtualVueTextDocument(doc)
        .templateService.getProgram()
        ?.getTypeChecker();

      assert.strictEqual(firstTypeChecker, secondTypeChecker);
    }).timeout(4000);
  });
});
