import { format } from './formatting';

export interface DocumentContext {
  resolveReference(ref: string, base?: string): string;
}

export function getVls() {
  return {
    format
  };
}
