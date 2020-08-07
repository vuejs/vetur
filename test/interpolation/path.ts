import { Uri } from 'vscode';
import { resolve } from 'path';

export const getDocPath = (p: string) => {
  return resolve(__dirname, `../../../test/interpolation/fixture`, p);
};
export const getDocUri = (p: string) => {
  return Uri.file(getDocPath(p));
};
