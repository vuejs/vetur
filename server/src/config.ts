import { PrettierVSCodeConfig } from './utils/prettier/prettier';
export interface VLSConfig {
  vetur: {
    validation: {
      template: boolean
      style: boolean
      script: boolean
    }
    completion: {
      autoImport: boolean
      useScaffoldSnippets: boolean
    }
    format: {
      defaultFormatter: {
        js: string
        ts: string
        [lang: string]: string
      }
      defaultFormatterOptions: {
        [lang: string]: {}
      }
      scriptInitialIndent: boolean
      styleInitialIndent: boolean
    }
  };
  css: {};
  html: {
    suggest: {}
  };
  prettier?: PrettierVSCodeConfig;
  javascript: {
    format: {}
  };
  typescript: {
    format: {}
  };
  emmet: {};
  stylusSupremacy: {};
}

export function getDefaultConfig(): VLSConfig {
  return {
    vetur: {
      validation: {
        template: true,
        style: true,
        script: true,
      },
      completion: {
        autoImport: false,
        useScaffoldSnippets: false,
      },
      format: {
        defaultFormatter: {
          js: 'prettier',
          ts: 'prettier',
        },
        defaultFormatterOptions: {},
        scriptInitialIndent: false,
        styleInitialIndent: false,
      },
    },
    css: {},
    html: {
      suggest: {}
    },
    javascript: {
      format: {}
    },
    typescript: {
      format: {}
    },
    emmet: {},
    stylusSupremacy: {},
  };
}
