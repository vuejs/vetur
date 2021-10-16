import { InitializeParams } from 'vscode-languageserver-protocol';
import { URI } from 'vscode-uri';

export function getInitParams(workspaceUri: URI): InitializeParams {
  const defaultVLSConfig = getDefaultVLSConfig();

  defaultVLSConfig.vetur.validation = {
    template: false,
    style: false,
    script: false,
    interpolation: true,
    templateProps: true
  };
  defaultVLSConfig.vetur.experimental = {
    templateInterpolationService: true
  };

  const init: InitializeParams = {
    rootPath: workspaceUri.fsPath,
    rootUri: workspaceUri.toString(),
    processId: process.pid,
    capabilities: {},
    initializationOptions: {
      config: defaultVLSConfig
    }
  } as InitializeParams;

  return init;
}

function getDefaultVLSConfig() {
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
        tagCasing: 'kebab',
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
    stylusSupremacy: {},
    languageStylus: {}
  };
}
