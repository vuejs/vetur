import path from 'path';
import fg from 'fast-glob';
import fs from 'fs';
import util from 'util';
import { performance } from 'perf_hooks';
import { logger } from '../log';
import { getPathDepth } from '../utils/paths';
// dependencies
import ts from 'typescript';
import prettier from 'prettier';
import prettyHTML from '@starptech/prettyhtml';
import prettierEslint from 'prettier-eslint';
import * as prettierTslint from 'prettier-tslint';
import stylusSupremacy from 'stylus-supremacy';
import * as prettierPluginPug from '@prettier/plugin-pug';

const readFileAsync = util.promisify(fs.readFile);
const accessFileAsync = util.promisify(fs.access);

export function createNodeModulesPaths(rootPath: string) {
  if (process.versions.pnp) {
    return [];
  }
  const startTime = performance.now();
  const nodeModules = fg.sync('**/node_modules', {
    cwd: rootPath.replace(/\\/g, '/'),
    absolute: true,
    unique: true,
    onlyFiles: false,
    onlyDirectories: true,
    suppressErrors: true,
    deep: 6,
    followSymbolicLinks: true,
    ignore: ['**/node_modules/**/node_modules']
  });

  logger.logInfo(`Find node_modules paths in ${rootPath} - ${Math.round(performance.now() - startTime)}ms`);
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

function compareDependency<M>(a: Dependency<M>, b: Dependency<M>) {
  const aDepth = getPathDepth(a.dir, path.sep);
  const bDepth = getPathDepth(b.dir, path.sep);

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
  readonly useWorkspaceDependencies: boolean;
  readonly nodeModulesPaths: string[];
  get<L extends keyof RuntimeLibrary>(lib: L, filePath?: string): Dependency<RuntimeLibrary[L]>;
  getBundled<L extends keyof RuntimeLibrary>(lib: L): Dependency<RuntimeLibrary[L]>;
}

const bundledModules = {
  typescript: ts,
  prettier,
  '@starptech/prettyhtml': prettyHTML,
  'prettier-eslint': prettierEslint,
  'prettier-tslint': prettierTslint,
  'stylus-supremacy': stylusSupremacy,
  '@prettier/plugin-pug': prettierPluginPug
};

export const createDependencyService = async (
  rootPathForConfig: string,
  workspacePath: string,
  useWorkspaceDependencies: boolean,
  nodeModulesPaths: string[],
  tsSDKPath?: string
): Promise<DependencyService> => {
  let loaded: { [K in keyof RuntimeLibrary]: Dependency<RuntimeLibrary[K]>[] };

  const loadTsSDKPath = () => {
    if (!tsSDKPath) {
      throw new Error('No tsSDKPath in settings');
    }
    const dir = path.isAbsolute(tsSDKPath)
      ? path.resolve(tsSDKPath, '..')
      : path.resolve(workspacePath, tsSDKPath, '..');
    const tsModule = require(dir);
    logger.logInfo(`Loaded typescript@${tsModule.version} from ${dir} for tsdk.`);

    return {
      dir,
      version: tsModule.version as string,
      bundled: false,
      module: tsModule as typeof ts
    };
  };

  const loadTypeScript = async (): Promise<Dependency<typeof ts>[]> => {
    try {
      if (useWorkspaceDependencies && tsSDKPath) {
        return [loadTsSDKPath()];
      }

      if (useWorkspaceDependencies) {
        const packages = await findAllPackages(nodeModulesPaths, 'typescript');
        if (packages.length === 0) {
          throw new Error(`No find any packages in ${rootPathForConfig}.`);
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
      logger.logDebug((e as Error).message);
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
          throw new Error(`No find ${name} packages in ${rootPathForConfig}.`);
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
      logger.logDebug((e as Error).message);
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

  if (!process.versions.pnp) {
    loaded = {
      typescript: await loadTypeScript(),
      prettier: await loadCommonDep('prettier', bundledModules['prettier']),
      '@starptech/prettyhtml': await loadCommonDep('@starptech/prettyhtml', bundledModules['@starptech/prettyhtml']),
      'prettier-eslint': await loadCommonDep('prettier-eslint', bundledModules['prettier-eslint']),
      'prettier-tslint': await loadCommonDep('prettier-tslint', bundledModules['prettier-tslint']),
      'stylus-supremacy': await loadCommonDep('stylus-supremacy', bundledModules['stylus-supremacy']),
      '@prettier/plugin-pug': await loadCommonDep('@prettier/plugin-pug', bundledModules['@prettier/plugin-pug'])
    };
  }

  const get = <L extends keyof RuntimeLibrary>(lib: L, filePath?: string): Dependency<RuntimeLibrary[L]> => {
    // We find it when yarn pnp. https://yarnpkg.com/features/pnp
    if (process.versions.pnp) {
      if (!useWorkspaceDependencies) {
        return getBundled(lib);
      }
      if (useWorkspaceDependencies && tsSDKPath && lib === 'typescript') {
        return loadTsSDKPath();
      }
      const pkgPath = require.resolve(lib, { paths: [filePath ?? workspacePath] });

      return {
        dir: path.dirname(pkgPath),
        version: '',
        bundled: false,
        module: require(pkgPath)
      };
    }
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
    while (
      rootPathForConfig === tempPath ||
      getPathDepth(rootPathForConfig, path.sep) < getPathDepth(tempPath, path.sep)
    ) {
      possiblePaths.push(path.resolve(tempPath, `node_modules/${lib}`));
      tempPath = path.resolve(tempPath, '../');
    }

    const result = deps.find(dep => possiblePaths.includes(dep.dir));
    return result ?? deps[0];
  };

  const getBundled = <L extends keyof RuntimeLibrary>(lib: L): Dependency<RuntimeLibrary[L]> => {
    return {
      dir: '',
      version: '',
      bundled: true,
      module: bundledModules[lib]
    };
  };

  return {
    useWorkspaceDependencies,
    nodeModulesPaths,
    get,
    getBundled
  };
};
