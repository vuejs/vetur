export interface VLSFormatConfig {
  defaultFormatter: {
    [lang: string]: string;
  };
  defaultFormatterOptions: {
    prettier: any;
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
      useScaffoldSnippets: boolean;
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

export function getDefaultVLSConfig(): VLSConfig {
  return {
    vetur: {
      useWorkspaceDependencies: false,
      validation: {
        template: true,
        style: true,
        script: true
      },
      completion: {
        autoImport: false,
        useScaffoldSnippets: false,
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
    }
  };
}
