import { BasicComponentInfo, VLSConfig, VLSFullConfig } from '../config';
import { inferVueVersion, VueVersion } from '../utils/vueVersion';

export interface EnvironmentService {
  configure(config: VLSFullConfig): void;
  getConfig(): VLSFullConfig;
  getRootPathForConfig(): string;
  getProjectRoot(): string;
  getTsConfigPath(): string | undefined;
  getPackagePath(): string | undefined;
  getVueVersion(): VueVersion;
  getSnippetFolder(): string;
  getGlobalComponentInfos(): BasicComponentInfo[];
}

export function createEnvironmentService(
  rootPathForConfig: string,
  projectPath: string,
  tsconfigPath: string | undefined,
  packagePath: string | undefined,
  snippetFolder: string,
  globalComponentInfos: BasicComponentInfo[],
  initialConfig: VLSConfig
): EnvironmentService {
  let $config = initialConfig;

  return {
    configure(config: VLSFullConfig) {
      $config = config;
    },
    getConfig: () => $config,
    getRootPathForConfig: () => rootPathForConfig,
    getProjectRoot: () => projectPath,
    getTsConfigPath: () => tsconfigPath,
    getPackagePath: () => packagePath,
    getVueVersion: () => inferVueVersion(packagePath),
    getSnippetFolder: () => snippetFolder,
    getGlobalComponentInfos: () => globalComponentInfos
  };
}
