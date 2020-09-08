import { LanguageMode } from '../embeddedSupport/languageModes';
import { CompletionList } from 'vscode-languageserver-types';

export const NULL_HOVER = {
  contents: []
};

export const NULL_SIGNATURE = null;

export const NULL_COMPLETION: CompletionList = {
  isIncomplete: false,
  items: []
};

export const nullMode: LanguageMode = {
  getId: () => '',
  onDocumentRemoved() {},
  dispose() {},
  doHover: () => NULL_HOVER,
  doComplete: () => NULL_COMPLETION,
  doSignatureHelp: () => NULL_SIGNATURE,
  findReferences: () => []
};
