import { Connection, Range } from 'vscode-languageserver';

export interface RefTokensService {
  send(uri: string, tokens: Range[]): void;
}

export function createRefTokensService(conn: Connection) {
  return {
    send(uri: string, tokens: Range[]) {
      conn.sendNotification('$/refTokens', { uri, tokens });
    }
  };
}
