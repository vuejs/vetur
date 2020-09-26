import { Runtime } from 'inspector';
import type { T_TypeScript } from '../services/dependencyService';
import { CancellationToken as TSCancellationToken, OperationCanceledException } from 'typescript';
import { CancellationTokenSource, CancellationToken as LSPCancellationToken } from 'vscode-languageserver';

export interface VCancellationToken extends LSPCancellationToken {
  tsToken: TSCancellationToken;
}

export class VCancellationTokenSource extends CancellationTokenSource {
  constructor(private tsModule: T_TypeScript) {
    super();
  }

  get token(): VCancellationToken {
    const token = super.token as VCancellationToken;
    // tslint:disable-next-line variable-name
    const Exception = this.tsModule.OperationCanceledException;
    token.tsToken = {
      isCancellationRequested() {
        return token.isCancellationRequested;
      },
      throwIfCancellationRequested() {
        if (token.isCancellationRequested) {
          throw new Exception();
        }
      }
    };
    return token;
  }
}

export function isVCancellationTokenCancel(token?: VCancellationToken) {
  return new Promise(resolve => {
    if (!token) {
      return false;
    }
    setImmediate(() => {
      resolve(token.isCancellationRequested);
    });
  });
}
