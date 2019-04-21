import { LanguageMode } from '../../embeddedSupport/languageModes';
import { Diagnostic, TextDocument } from 'vscode-languageserver';

export class VueInterpolationMode implements LanguageMode {
  getId() {
    return 'vue-html-interpolation';
  }

  doValidation(document: TextDocument): Diagnostic[] {
    console.log(document);
    return [];
  }

  onDocumentRemoved() {}

  dispose() {}
}
