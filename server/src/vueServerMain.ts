import { createConnection, InitializeParams, InitializeResult } from 'vscode-languageserver/node';
import { VLS } from './services/vls';

const connection = process.argv.length <= 2 ? createConnection(process.stdin, process.stdout) : createConnection();

console.log = (...args: any[]) => connection.console.log(args.join(' '));
console.error = (...args: any[]) => connection.console.error(args.join(' '));

const vls = new VLS(connection);
connection.onInitialize(
  async (params: InitializeParams): Promise<InitializeResult> => {
    await vls.init(params);

    console.log('Vetur initialized');

    return {
      capabilities: vls.capabilities
    };
  }
);

vls.listen();
