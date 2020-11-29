import { RuntimeLibrary } from '../services/dependencyService';
import { CancellationToken as TSCancellationToken } from 'typescript';
import { CancellationTokenSource, CancellationToken as LSPCancellationToken } from 'vscode-languageserver';

export interface VCancellationToken extends LSPCancellationToken {
  tsToken: TSCancellationToken;
}

export class VCancellationTokenSource extends CancellationTokenSource {
  get token(): VCancellationToken {
    const token = super.token as VCancellationToken;
    token.tsToken = {
      isCancellationRequested() {
        return token.isCancellationRequested;
      },
      throwIfCancellationRequested() {
        if (token.isCancellationRequested) {
          throw new Error('OperationCanceledException');
        }
      }
    };
    return token;
  }
}

export function isVCancellationRequested(token?: VCancellationToken) {
  return new Promise(resolve => {
    if (!token) {
      resolve(false);
    } else {
      setImmediate(() => resolve(token.isCancellationRequested));
    }
  });
}
