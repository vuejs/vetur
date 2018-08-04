import { LanguageMode } from './languageModes';

export const NULL_HOVER = {
  contents: []
};

export const NULL_SIGNATURE = {
  signatures: [],
  activeSignature: 0,
  activeParameter: 0
};

export const NULL_COMPLETION = {
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
