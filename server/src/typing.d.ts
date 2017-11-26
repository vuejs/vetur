declare module 'eslint' {
  export interface ESLintError {
    ruleId: string;
    severity: number;
    message: string;
    line: number;
    column: number;
    nodeType: string;
    source: string;
    endLine?: number;
    endColumn?: number;
  }
  export interface Report {
    results: {
      messages: ESLintError[];
    }[];
  }
  export class CLIEngine {
    constructor(config: any);
    executeOnText(text: string, filename: string): Report;
  }
}

declare module 'vue-template-compiler';
declare module 'vue-template-es2015-compiler';
declare module 'eslint-plugin-vue';
declare module 'vscode-emmet-helper';
declare module 'parse-gitignore';
declare module '*.json';
