declare module 'vue-template-compiler' {
  interface SFCCustomBlock {
    type: string;
    content: string;
    start?: number;
    end?: number;
    src?: string;
    attrs: {[attribute:string]: string};
  }

  interface SFCBlock {
    type: string;
    content: string;
    start?: number;
    end?: number;
    lang?: string;
    src?: string;
    scoped?: boolean;
    module?: string | boolean;
  }

  interface SFCDescriptor {
    template?: SFCBlock;
    script?: SFCBlock;
    styles: SFCBlock[];
    customBlocks: SFCCustomBlock[];
  }

  export function parseComponent(text: string, option: {pad: 'line' | 'space'}): SFCDescriptor;
}

declare module 'eslint' {
  export interface ESLintError {
      ruleId: string;
      severity: number;
      message: string;
      line: number;
      column: number;
      nodeType: string;
      source: string;
      endLine: number;
      endColumn: number;
  }
  export interface Report {
    results: {
      messages: ESLintError[]
    }[];
  }
  export class CLIEngine {
    constructor(config: any)
    executeOnText(text: string, filename: string): Report;
  }
}
declare module 'eslint-plugin-vue';
