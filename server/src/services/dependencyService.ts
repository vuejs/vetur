import path from 'path';
import fg from 'fast-glob';
import fs from 'fs';
import util from 'util';
// dependencies
import ts from 'typescript';
import prettier from 'prettier';
import prettyHTML from '@starptech/prettyhtml';
import prettierEslint from 'prettier-eslint';
import * as prettierTslint from 'prettier-tslint';
import stylusSupremacy from 'stylus-supremacy';
import * as prettierPluginPug from '@prettier/plugin-pug';
import { performance } from 'perf_hooks';
import { logger } from '../log';

const readFileAsync = util.promisify(fs.readFile);
const accessFileAsync = util.promisify(fs.access);

async function createNodeModulesPaths(workspacePath: string) {
  const startTime = performance.now();
  const nodeModules = await fg('**/node_modules', {
    cwd: workspacePath.replace(/\\/g, '/'),
    absolute: true,
    unique: true,
    onlyFiles: false,
    onlyDirectories: true,
    deep: 6,
    followSymbolicLinks: false,
    ignore: ['**/node_modules/**/node_modules']
  });

  logger.logInfo(`Find node_modules paths in ${workspacePath} - ${Math.round(performance.now() - startTime)}ms`);
  return nodeModules;
}

async function findAllPackages(nodeModulesPaths: string[], moduleName: string) {
  async function getPackage(nodeModulesPath: string) {
    const packageJSONPath = path.resolve(nodeModulesPath, moduleName, 'package.json');
    try {
      await accessFileAsync(packageJSONPath, fs.constants.R_OK);
      const info: { name: string; version: string; main: string } = JSON.parse(
        await readFileAsync(packageJSONPath, { encoding: 'utf8' })
      );
      return {
        name: info.name,
        dir: path.dirname(packageJSONPath),
        version: info.version,
        module: require(path.resolve(path.dirname(packageJSONPath), info.main))
      };
    } catch {
      return null;
    }
  }

  const packages = (await Promise.all(nodeModulesPaths.map(path => getPackage(path)))).filter(info => info) as Array<{
    name: string;
    dir: string;
    version: string;
    module: unknown;
  }>;

  return packages;
}

function getPathDepth(filePath: string) {
  return filePath.split(path.sep).length;
}

function compareDependency<M>(a: Dependency<M>, b: Dependency<M>) {
  const aDepth = getPathDepth(a.dir);
  const bDepth = getPathDepth(b.dir);

  return bDepth - aDepth;
}

interface Dependency<M> {
  dir: string;
  version: string;
  bundled: boolean;
  module: M;
}

export interface RuntimeLibrary {
  typescript: typeof ts;
  prettier: typeof prettier;
  '@starptech/prettyhtml': typeof prettyHTML;
  'prettier-eslint': typeof prettierEslint;
  'prettier-tslint': typeof prettierTslint;
  'stylus-supremacy': typeof stylusSupremacy;
  '@prettier/plugin-pug': typeof prettierPluginPug;
}

export interface DependencyService {
  useWorkspaceDependencies: boolean;
  workspacePath: string;
  init(workspacePath: string, useWorkspaceDependencies: boolean, tsSDKPath?: string): Promise<void>;
  get<L extends keyof RuntimeLibrary>(lib: L, filePath?: string): Dependency<RuntimeLibrary[L]>;
}

export const createDependencyService = () => {
  let useWorkspaceDeps: boolean;
  let rootPath: string;
  let loaded: { [K in keyof RuntimeLibrary]: Dependency<RuntimeLibrary[K]>[] };

  async function init(workspacePath: string, useWorkspaceDependencies: boolean, tsSDKPath?: string) {
    const nodeModulesPaths = useWorkspaceDependencies ? await createNodeModulesPaths(workspacePath) : [];

    const loadTypeScript = async (): Promise<Dependency<typeof ts>[]> => {
      try {
        if (useWorkspaceDependencies && tsSDKPath) {
          const dir = path.isAbsolute(tsSDKPath)
            ? path.resolve(tsSDKPath, '..')
            : path.resolve(workspacePath, tsSDKPath, '..');
          const tsModule = require(dir);
          logger.logInfo(`Loaded typescript@${tsModule.version} from ${dir} for tsdk.`);

          return [
            {
              dir,
              version: tsModule.version as string,
              bundled: false,
              module: tsModule as typeof ts
            }
          ];
        }

        if (useWorkspaceDependencies) {
          const packages = await findAllPackages(nodeModulesPaths, 'typescript');
          if (packages.length === 0) {
            throw new Error(`No find any packages in ${workspacePath}.`);
          }

          return packages
            .map(pkg => {
              logger.logInfo(`Loaded typescript@${pkg.version} from ${pkg.dir}.`);

              return {
                dir: pkg.dir,
                version: pkg.version as string,
                bundled: false,
                module: pkg.module as typeof ts
              };
            })
            .sort(compareDependency);
        }

        throw new Error('No useWorkspaceDependencies.');
      } catch (e) {
        logger.logDebug(e.message);
        logger.logInfo(`Loaded bundled typescript@${ts.version}.`);
        return [
          {
            dir: '',
            version: ts.version,
            bundled: true,
            module: ts
          }
        ];
      }
    };

    const loadCommonDep = async <N extends string, BM>(name: N, bundleModule: BM): Promise<Dependency<BM>[]> => {
      try {
        if (useWorkspaceDependencies) {
          const packages = await findAllPackages(nodeModulesPaths, name);
          if (packages.length === 0) {
            throw new Error(`No find ${name} packages in ${workspacePath}.`);
          }

          return packages
            .map(pkg => {
              logger.logInfo(`Loaded ${name}@${pkg.version} from ${pkg.dir}.`);

              return {
                dir: pkg.dir,
                version: pkg.version as string,
                bundled: false,
                module: pkg.module as BM
              };
            })
            .sort(compareDependency);
        }
        throw new Error('No useWorkspaceDependencies.');
      } catch (e) {
        logger.logDebug(e.message);
        // TODO: Get bundle package version
        logger.logInfo(`Loaded bundled ${name}.`);
        return [
          {
            dir: '',
            version: '',
            bundled: true,
            module: bundleModule as BM
          }
        ];
      }
    };

    useWorkspaceDeps = useWorkspaceDependencies;
    rootPath = workspacePath;
    loaded = {
      typescript: await loadTypeScript(),
      prettier: await loadCommonDep('prettier', prettier),
      '@starptech/prettyhtml': await loadCommonDep('@starptech/prettyhtml', prettyHTML),
      'prettier-eslint': await loadCommonDep('prettier-eslint', prettierEslint),
      'prettier-tslint': await loadCommonDep('prettier-tslint', prettierTslint),
      'stylus-supremacy': await loadCommonDep('stylus-supremacy', stylusSupremacy),
      '@prettier/plugin-pug': await loadCommonDep('@prettier/plugin-pug', prettierPluginPug)
    };
  }

  const get = <L extends keyof RuntimeLibrary>(lib: L, filePath?: string): Dependency<RuntimeLibrary[L]> => {
    if (!loaded) {
      throw new Error('Please call init function before get dependency.');
    }
    const deps = loaded[lib] as Dependency<RuntimeLibrary[L]>[];

    // When no filePath, read root workspace dep
    if (!filePath) {
      return deps[deps.length - 1];
    }
    // When only one dep, return it
    if (deps.length === 1) {
      return deps[0];
    }

    const possiblePaths: string[] = [];
    let tempPath = path.dirname(filePath);
    while (rootPath === tempPath || getPathDepth(rootPath) > getPathDepth(tempPath)) {
      possiblePaths.push(path.resolve(tempPath, `node_modules/${lib}`));
      tempPath = path.resolve(tempPath, '../');
    }

    const result = deps.find(dep => possiblePaths.includes(dep.dir));
    return result ?? deps[0];
  };

  return {
    get useWorkspaceDependencies() {
      return useWorkspaceDeps;
    },
    get workspacePath() {
      return rootPath;
    },
    init,
    get
  };
};
