import { Uri } from 'vscode';
import { resolve } from 'path';

export const getDocPath = (p: string) => {
  return Uri.file(resolve(__dirname, `../../../test/interpolation/fixture`, p)).fsPath;
};
export const getDocUri = (p: string) => {
  return Uri.file(getDocPath(p));
};
