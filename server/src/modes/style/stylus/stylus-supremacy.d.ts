import { FormattingOptions } from 'stylus-supremacy';
import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
export interface IStylusSupremacy {
  createFormattingOptions(options: any): FormattingOptions;
  format(content: string, 
    options: FormattingOptions, 
    cancellationToken: vscode.CancellationToken | null, 
    originalRange: Range): string;
}
