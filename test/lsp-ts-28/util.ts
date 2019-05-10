import * as vscode from 'vscode';
import * as path from 'path';

export function position(line: number, char: number) {
  return new vscode.Position(line, char);
}
export function range(startLine: number, startChar: number, endLine: number, endChar: number) {
  return new vscode.Range(position(startLine, startChar), position(endLine, endChar));
}
export function sameLineRange(line: number, startChar: number, endChar: number) {
  return new vscode.Range(position(line, startChar), position(line, endChar));
}
export function location(uri: vscode.Uri, startLine: number, startChar: number, endLine: number, endChar: number) {
  return new vscode.Location(uri, range(startLine, startChar, endLine, endChar));
}
export function sameLineLocation(uri: vscode.Uri, line: number, startChar: number, endChar: number) {
  return new vscode.Location(uri, sameLineRange(line, startChar, endChar));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../../test/lsp-ts-28/fixture', p);
};
export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};
