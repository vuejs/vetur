import ts from 'typescript';

export function findConfigFile(workspacePath: string, configName: string) {
  return ts.findConfigFile(workspacePath, ts.sys.fileExists, configName);
}
