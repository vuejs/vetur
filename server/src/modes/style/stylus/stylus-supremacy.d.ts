import { FormattingOptions } from 'stylus-supremacy';

export interface IStylusSupremacy {
  createFormattingOptions(options: any): FormattingOptions;
  format(content: string, options: FormattingOptions): string;
}
