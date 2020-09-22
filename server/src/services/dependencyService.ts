import path from 'path';
import fg from 'fast-glob';
import fs from 'fs';
import util from 'util';
// dependencies
import ts from 'typescript';
import prettier from 'prettier';
import prettyHTML from '@starptech/prettyhtml';
import prettierEslint from 'prettier-eslint';
import prettierTslint from 'prettier-tslint';
import stylusSupremacy from 'stylus-supremacy';
import prettierPluginPug from '@prettier/plugin-pug';
import { performance } from 'perf_hooks';
import { logger } from '../log';

const readFileAsync = util.promisify(fs.readFile);

async function findAllPackages(workspacePath: string, moduleName: string) {
  const startTime = performance.now();
  const packages = await fg(`**/node_modules/${moduleName}/package.json`, {
    cwd: workspacePath,
    absolute: true,
    unique: true
  }).then(filePaths =>
    Promise.all(
      filePaths.map(filePath =>
        readFileAsync(filePath, { encoding: 'utf8' }).then(content => {
          const info = JSON.parse(content) as { name: string; version: string; main: string };

          return {
            name: info.name,
            dir: path.dirname(filePath),
            version: info.version,
            module: eval('require')(path.resolve(path.dirname(filePath), info.main))
          };
        })
      )
    )
  );
  logger.logInfo(`Try to find ${moduleName} in ${workspacePath}. - ${Math.round(performance.now() - startTime)}ms`);

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
  rootPath: string
  init(workspacePath: string, useWorkspaceDependencies: boolean, tsSDKPath?: string): Promise<void>;
  get<L extends keyof RuntimeLibrary>(lib: L, filePath?: string): Dependency<RuntimeLibrary[L]>;
}

export const createDependencyService = () => {
  let rootPath: string;
  let loaded: { [K in keyof RuntimeLibrary]: Dependency<RuntimeLibrary[K]>[] };

  async function init(workspacePath: string, useWorkspaceDependencies: boolean, tsSDKPath?: string) {
    const loadTypeScript = async (): Promise<Dependency<typeof ts>[]> => {
      try {
        if (useWorkspaceDependencies && tsSDKPath) {
          const dir = path.isAbsolute(tsSDKPath)
            ? path.resolve(tsSDKPath, '..')
            : path.resolve(workspacePath, tsSDKPath, '..');
          const tsModule = eval('require')(dir);
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
          const packages = await findAllPackages(workspacePath, 'typescript');
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
          const packages = await findAllPackages(workspacePath, name);
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
    get rootPath () {
      return rootPath
    },
    init,
    get
  };
};
