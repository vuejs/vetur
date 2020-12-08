import ts from 'typescript';

export function findConfigFile(findPath: string, configName: string) {
  return ts.findConfigFile(findPath, ts.sys.fileExists, configName);
}

export function requireUncached(module: string) {
  delete require.cache[require.resolve(module)];
  return require(module);
}
