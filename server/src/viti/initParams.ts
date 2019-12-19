export const params = {
  /**
   * Doesn't matter as long as its positive
   */
  processId: 1,
  capabilities: {},
  initializationOptions: {
    config: {
      /**
       * @Todo Investigate why CLI stops working when no html config is passed in
       */
      html: {},
      vetur: {
        useWorkspaceDependencies: false,
        completion: {
          autoImport: true,
          useScaffoldSnippets: true,
          tagCasing: 'initial'
        },
        grammar: {
          customBlocks: {
            docs: 'md',
            i18n: 'json'
          }
        },
        validation: {
          template: true,
          style: false,
          script: false
        },
        format: {
          enable: true,
          options: {
            tabSize: 2,
            useTabs: false
          },
          defaultFormatter: {
            html: 'prettier',
            css: 'prettier',
            postcss: 'prettier',
            scss: 'prettier',
            less: 'prettier',
            stylus: 'stylus-supremacy',
            js: 'prettier',
            ts: 'prettier'
          },
          defaultFormatterOptions: {
            'js-beautify-html': {
              wrap_attributes: 'force-expand-multiline'
            },
            prettyhtml: {
              printWidth: 100,
              singleQuote: false,
              wrapAttributes: false,
              sortAttributes: false
            }
          },
          styleInitialIndent: true,
          scriptInitialIndent: true
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
          templateInterpolationService: true
        }
      }
    }
  }
};
