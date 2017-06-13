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
