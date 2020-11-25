import path from 'path';
import { getPathDepth, normalizeFileNameToFsPath, normalizeResolve } from './utils/paths';
import fg from 'fast-glob';
import { findConfigFile } from './utils/workspace';
import { flatten } from 'lodash';

export interface VLSFormatConfig {
  defaultFormatter: {
    [lang: string]: string;
  };
  defaultFormatterOptions: {
    [lang: string]: any;
  };
  scriptInitialIndent: boolean;
  styleInitialIndent: boolean;
  options: {
    tabSize: number;
    useTabs: boolean;
  };
}

export interface VLSConfig {
  vetur: {
    useWorkspaceDependencies: boolean;
    completion: {
      autoImport: boolean;
      tagCasing: 'initial' | 'kebab';
      scaffoldSnippetSources: {
        workspace: string;
        user: string;
        vetur: string;
      };
    };
    grammar: {
      customBlocks: { [lang: string]: string };
    };
    validation: {
      template: boolean;
      templateProps: boolean;
      interpolation: boolean;
      style: boolean;
      script: boolean;
    };
    format: {
      enable: boolean;
      options: {
        tabSize: number;
        useTabs: boolean;
      };
      defaultFormatter: {
        [lang: string]: string;
      };
      defaultFormatterOptions: {
        [lang: string]: {};
      };
      scriptInitialIndent: boolean;
      styleInitialIndent: boolean;
    };
    languageFeatures: {
      codeActions: boolean;
    };
    trace: {
      server: 'off' | 'messages' | 'verbose';
    };
    dev: {
      vlsPath: string;
      vlsPort: number;
      logLevel: 'INFO' | 'DEBUG';
    };
    experimental: {
      templateInterpolationService: boolean;
    };
  };
}

export interface VLSFullConfig extends VLSConfig {
  emmet?: any;
  html?: any;
  css?: any;
  javascript?: any;
  typescript?: any;
  prettier?: any;
  stylusSupremacy?: any;
}

export function getDefaultVLSConfig(): VLSFullConfig {
  return {
    vetur: {
      useWorkspaceDependencies: false,
      validation: {
        template: true,
        templateProps: false,
        interpolation: true,
        style: true,
        script: true
      },
      completion: {
        autoImport: false,
        tagCasing: 'initial',
        scaffoldSnippetSources: {
          workspace: '💼',
          user: '🗒️',
          vetur: '✌'
        }
      },
      grammar: {
        customBlocks: {}
      },
      format: {
        enable: true,
        options: {
          tabSize: 2,
          useTabs: false
        },
        defaultFormatter: {},
        defaultFormatterOptions: {},
        scriptInitialIndent: false,
        styleInitialIndent: false
      },
      languageFeatures: {
        codeActions: true
      },
      trace: {
        server: 'off'
      },
      dev: {
        vlsPath: '',
        vlsPort: -1,
        logLevel: 'INFO'
      },
      experimental: {
        templateInterpolationService: false
      }
    },
    css: {},
    html: {
      suggest: {}
    },
    javascript: {
      format: {}
    },
    typescript: {
      tsdk: null,
      format: {}
    },
    emmet: {},
    stylusSupremacy: {}
  };
}

export interface BasicComponentInfo {
  name: string;
  path: string;
}

export type Glob = string;

export interface VeturProject<C = BasicComponentInfo | Glob> {
  root: string;
  package?: string;
  tsconfig?: string;
  globalComponents: C[];
}

export interface VeturFullConfig {
  settings: Record<string, boolean | string | number>;
  projects: VeturProject<BasicComponentInfo>[];
}

export type VeturConfig = Partial<Pick<VeturFullConfig, 'settings'>> & {
  projects?: Array<string | (Pick<VeturProject, 'root'> & Partial<VeturProject>)>;
};

export async function getVeturFullConfig(
  rootPathForConfig: string,
  workspacePath: string,
  veturConfig: VeturConfig
): Promise<VeturFullConfig> {
  const oldProjects = veturConfig.projects ?? [workspacePath];
  const projects = oldProjects
    .map(project => {
      const getFallbackPackagePath = (projectRoot: string) => {
        const fallbackPackage = findConfigFile(projectRoot, 'package.json');
        return fallbackPackage ? normalizeFileNameToFsPath(fallbackPackage) : undefined;
      };

      if (typeof project === 'string') {
        const projectRoot = normalizeResolve(rootPathForConfig, project);
        const tsconfigPath =
          findConfigFile(projectRoot, 'tsconfig.json') ?? findConfigFile(projectRoot, 'jsconfig.json');

        return {
          root: projectRoot,
          package: getFallbackPackagePath(projectRoot),
          tsconfig: tsconfigPath ? normalizeFileNameToFsPath(tsconfigPath) : undefined,
          globalComponents: []
        } as VeturProject;
      }

      const projectRoot = normalizeResolve(rootPathForConfig, project.root);
      return {
        root: projectRoot,
        package: project.package ?? getFallbackPackagePath(projectRoot),
        tsconfig: project.tsconfig ?? undefined,
        globalComponents: flatten(
          project.globalComponents?.map(comp => {
            if (typeof comp === 'string') {
              return fg
                .sync(comp, { cwd: normalizeResolve(rootPathForConfig, projectRoot), absolute: true })
                .map(fileName => ({
                  name: path.basename(fileName, path.extname(fileName)),
                  path: normalizeFileNameToFsPath(fileName)
                }));
            }
            return comp;
          }) ?? []
        )
      } as VeturProject<BasicComponentInfo>;
    })
    .sort((a, b) => getPathDepth(b.root, '/') - getPathDepth(a.root, '/'));

  return {
    settings: veturConfig.settings ?? {},
    projects
  } as VeturFullConfig;
}
