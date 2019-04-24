import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient';

let fileName = '';
let virtualFileSource = '';
let prettySourceMap = '';

const separator = Array(20)
  .fill('=')
  .join('');

export async function registerVeturTextDocumentProviders() {
  return vscode.workspace.registerTextDocumentContentProvider('vetur', {
    provideTextDocumentContent(uri: vscode.Uri) {
      return buildUpContent();
    }
  });
}

export function generateShowVirtualFileCommand(client: LanguageClient) {
  return async () => {
    if (!vscode.window.activeTextEditor || !vscode.window.activeTextEditor.document.fileName.endsWith('.vue')) {
      return vscode.window.showInformationMessage(
        'Failed to show virtual file. Make sure the current file is a .vue file.'
      );
    }

    const currFileName = vscode.window.activeTextEditor.document.fileName;
    const currFileText = vscode.window.activeTextEditor.document.getText();
    const uri = vscode.Uri.parse('vetur:' + currFileName);
    fileName = currFileName;

    const result = await client.sendRequest('$/queryVirtualFileInfo', { fileName, currFileText });
    virtualFileSource = (result as any).source;
    prettySourceMap = (result as any).sourceMapNodesString;

    vscode.window.showTextDocument(uri);
  };
}

export function setVirtualContents(virtualFileSource: string, prettySourceMap: string) {
  virtualFileSource = virtualFileSource;
  prettySourceMap = prettySourceMap;
}

function buildUpContent() {
  return `${separator}
Virtual content of ${fileName + '.template'}
Hover, semantic diagnostics, jump to definition and find references are run on this file.
${separator}

${virtualFileSource}

${separator}
SourceMap
from: ${fileName}
to  : ${fileName + '.template'}
[VueFileStart, VueFileEnd, VueFileText] => [TSVirtualFileStart, TSVirtualFileEnd, TSVirtualFileText]
${separator}

${prettySourceMap}
`;
}
