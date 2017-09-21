import { createConnection, TextDocuments, InitializeParams, InitializeResult, DocumentRangeFormattingRequest, Disposable, DocumentSelector, RequestType } from 'vscode-languageserver';
import { TextDocument, Diagnostic, Range, Position } from 'vscode-languageserver-types';
import Uri from 'vscode-uri';
import { DocumentContext, getVls } from './service';
import * as url from 'url';
import * as path from 'path';
import * as _ from 'lodash';

namespace ColorSymbolRequest {
  export const type: RequestType<string, Range[], any, any> = new RequestType('vue/colorSymbols');
}

// Create a connection for the server
const connection = process.argv.length <= 2
  ? createConnection(process.stdin, process.stdout) // no arg specified
  : createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let workspacePath: string | null | undefined;
let config: any = {};
const vls = getVls();

let veturFormattingOptions = {};

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites
connection.onInitialize((params: InitializeParams): InitializeResult => {
  console.log('vetur initialized');
  const initializationOptions = params.initializationOptions;

  workspacePath = params.rootPath;
  vls.initialize(workspacePath);

  documents.onDidClose(e => {
    vls.removeDocument(e.document);
  });
  connection.onShutdown(() => {
    vls.dispose();
  });

  if (initializationOptions) {
    veturFormattingOptions = initializationOptions.veturConfig.format;
  }

  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: documents.syncKind,
      completionProvider: { resolveProvider: true, triggerCharacters: ['.', ':', '<', '"', '/', '@', '*'] },
      signatureHelpProvider: { triggerCharacters: ['('] },
      documentRangeFormattingProvider: true,
      hoverProvider: true,
      documentHighlightProvider: true,
      documentSymbolProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      documentOnTypeFormattingProvider: {
        firstTriggerCharacter: ';',
        moreTriggerCharacter: ['}', '\n']
      }
    }
  };
});

let formatterRegistration: Thenable<Disposable>;

// The settings have changed. Is send on server activation as well.
connection.onDidChangeConfiguration((change) => {
  config = change.settings;
  vls.configure(config);

  // Update formatting setting
  veturFormattingOptions = config.vetur.format;
  documents.all().forEach(triggerValidation);

  const documentSelector: DocumentSelector = [{ language: 'vue' }];
  formatterRegistration = connection.client.register(DocumentRangeFormattingRequest.type, { documentSelector });
});

const pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
const validationDelayMs = 200;

// When the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  triggerValidation(change.document);
});

// A document has closed: clear all diagnostics
documents.onDidClose(event => {
  cleanPendingValidation(event.document);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

function cleanPendingValidation(textDocument: TextDocument): void {
  const request = pendingValidationRequests[textDocument.uri];
  if (request) {
    clearTimeout(request);
    delete pendingValidationRequests[textDocument.uri];
  }
}

function triggerValidation(textDocument: TextDocument): void {
  cleanPendingValidation(textDocument);
  pendingValidationRequests[textDocument.uri] = setTimeout(() => {
    delete pendingValidationRequests[textDocument.uri];
    validateTextDocument(textDocument);
  }, validationDelayMs);
}

function validateTextDocument(textDocument: TextDocument): void {
  const diagnostics: Diagnostic[] = vls.validate(textDocument);
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onCompletion(textDocumentPosition => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  return vls.doComplete(document, textDocumentPosition.position);
});

connection.onCompletionResolve(item => {
  const data = item.data;
  if (data && data.languageId && data.uri) {
    const document = documents.get(data.uri);
    return vls.doResolve(document, data.languageId, item);
  }
  return item;
});

connection.onHover(textDocumentPosition => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  return vls.doHover(document, textDocumentPosition.position);
});

connection.onDocumentHighlight(documentHighlightParams => {
  const document = documents.get(documentHighlightParams.textDocument.uri);
  return vls.findDocumentHighlight(document, documentHighlightParams.position);
});

connection.onDefinition(definitionParams => {
  const document = documents.get(definitionParams.textDocument.uri);
  return vls.findDefinition(document, definitionParams.position);
});

connection.onReferences(referenceParams => {
  const document = documents.get(referenceParams.textDocument.uri);
  return vls.findReferences(document, referenceParams.position);
});

connection.onSignatureHelp(signatureHelpParms => {
  const document = documents.get(signatureHelpParms.textDocument.uri);
  return vls.doSignatureHelp(document, signatureHelpParms.position);
});

connection.onDocumentRangeFormatting(formatParams => {
  const document = documents.get(formatParams.textDocument.uri);

  const formattingOptions = _.assign({}, formatParams.options, veturFormattingOptions);

  return vls.format(document, formatParams.range, formattingOptions);
});

connection.onDocumentOnTypeFormatting(onTypeFormatParams => {
  const document = documents.get(onTypeFormatParams.textDocument.uri);

  const formattingOptions = _.assign({}, onTypeFormatParams.options, veturFormattingOptions);
  const endPos = onTypeFormatParams.position;
  const startLine = onTypeFormatParams.ch === '\n'
    ? endPos.line - 1 : endPos.line;
  const startPos = Position.create(startLine, 1);
  const range = Range.create(startPos, endPos);

  return vls.format(document, range, formattingOptions);
});

connection.onDocumentLinks(documentLinkParam => {
  const document = documents.get(documentLinkParam.textDocument.uri);
  const documentContext: DocumentContext = {
    resolveReference: ref => {
      if (workspacePath && ref[0] === '/') {
        return Uri.file(path.join(workspacePath, ref)).toString();
      }
      return url.resolve(document.uri, ref);
    }
  };
  return vls.findDocumentLinks(document, documentContext);
});

connection.onDocumentSymbol(documentSymbolParms => {
  const document = documents.get(documentSymbolParms.textDocument.uri);
  return vls.findDocumentSymbols(document);
});

connection.onRequest(ColorSymbolRequest.type, uri => {
  const document = documents.get(uri);
  if (document) {
    return vls.findColorSymbols(document);
  }
  return [];
});

// Listen on the connection
connection.listen();
