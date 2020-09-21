import { parseVueScript } from './preprocess';
import type ts from 'typescript';
import { isVirtualVueFile } from './util';
import { RuntimeLibrary } from '../dependencyService';

export function getVueSys(tsModule: RuntimeLibrary['typescript'], scriptFileNameSet: Set<string>) {
  /**
   * This part is only accessed by TS module resolution
   */
  const vueSys: ts.System = {
    ...tsModule.sys,
    fileExists(path: string) {
      if (isVirtualVueFile(path, scriptFileNameSet)) {
        return tsModule.sys.fileExists(path.slice(0, -'.ts'.length));
      }
      return tsModule.sys.fileExists(path);
    },
    readFile(path, encoding) {
      if (isVirtualVueFile(path, scriptFileNameSet)) {
        const fileText = tsModule.sys.readFile(path.slice(0, -'.ts'.length), encoding);
        return fileText ? parseVueScript(fileText) : fileText;
      }
      const fileText = tsModule.sys.readFile(path, encoding);
      return fileText;
    }
  };

  if (tsModule.sys.realpath) {
    const realpath = tsModule.sys.realpath;
    vueSys.realpath = function (path) {
      if (isVirtualVueFile(path, scriptFileNameSet)) {
        return realpath(path.slice(0, -'.ts'.length)) + '.ts';
      }
      return realpath(path);
    };
  }

  return vueSys;
}
