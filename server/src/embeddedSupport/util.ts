import { TextDocument, Range } from 'vscode-languageserver-types';

export function offsetsToRange(document: TextDocument, start: number, end: number) {
  return Range.create(document.positionAt(start), document.positionAt(end));
}
