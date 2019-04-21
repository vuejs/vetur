import { T_TypeScript } from '../dependencyService';
import { parseVueScript } from './preprocess';
import * as ts from 'typescript';
import { isVirtualVueFile } from './util';

export function getVueSys(tsModule: T_TypeScript) {
  /**
   * This part is only accessed by TS module resolution
   */
  const vueSys: ts.System = {
    ...tsModule.sys,
    fileExists(path: string) {
      if (isVirtualVueFile(path)) {
        return tsModule.sys.fileExists(path.slice(0, -'.ts'.length));
      }
      return tsModule.sys.fileExists(path);
    },
    readFile(path, encoding) {
      if (isVirtualVueFile(path)) {
        const fileText = tsModule.sys.readFile(path.slice(0, -'.ts'.length), encoding);
        return fileText ? parseVueScript(fileText) : fileText;
      }
      const fileText = tsModule.sys.readFile(path, encoding);
      return fileText;
    }
  };

  if (tsModule.sys.realpath) {
    const realpath = tsModule.sys.realpath;
    vueSys.realpath = function(path) {
      if (isVirtualVueFile(path)) {
        return realpath(path.slice(0, -'.ts'.length)) + '.ts';
      }
      return realpath(path);
    };
  }

  return vueSys;
}
