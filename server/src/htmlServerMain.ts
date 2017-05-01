import { createConnection, IConnection, TextDocuments, InitializeParams, InitializeResult, RequestType, DocumentRangeFormattingRequest, Disposable, DocumentSelector } from 'vscode-languageserver';
import { DocumentContext } from 'vetur-vls';
import { TextDocument, Diagnostic, DocumentLink, Range, SymbolInformation } from 'vscode-languageserver-types';
import { getLanguageModes, LanguageModes } from './modes/languageModes';

import { format } from './modes/formatting';

import * as url from 'url';
import * as path from 'path';
import uri from 'vscode-uri';
import * as _ from 'lodash';

// Create a connection for the server
let connection: IConnection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let workspacePath: string;
var languageModes: LanguageModes;
var settings: any = {};

let clientSnippetSupport = false;
let clientDynamicRegisterSupport = false;

let veturFormattingOptions: any = {};

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites
connection.onInitialize((params: InitializeParams): InitializeResult => {
  let initializationOptions = params.initializationOptions;

  workspacePath = params.rootPath;

  languageModes = getLanguageModes(workspacePath);
  documents.onDidClose(e => {
    languageModes.onDocumentRemoved(e.document);
  });
  connection.onShutdown(() => {
    languageModes.dispose();
  });

  veturFormattingOptions = initializationOptions.veturConfig.format;

  return {
    capabilities: {
      // Tell the client that the server works in FULL text document sync mode
      textDocumentSync: documents.syncKind,
      completionProvider: { resolveProvider: true, triggerCharacters: ['.', ':', '<', '"', '=', '/'] },
      documentRangeFormattingProvider: true
    }
  };
});

const validation = {
  'vue-html': true,
  html: true,
  css: true,
  javascript: true,
  scss: true,
  less: true
};

let formatterRegistration: Thenable<Disposable>;

// The settings have changed. Is send on server activation as well.
connection.onDidChangeConfiguration((change) => {
  settings = change.settings;

  // Update formatting setting
  veturFormattingOptions = settings.vetur.format;

  // Todo: Add vetur's own validation toggle setting

  languageModes.getAllModes().forEach(m => {
    if (m.configure) {
      m.configure(change.settings);
    }
  });
  documents.all().forEach(triggerValidation);

  let documentSelector: DocumentSelector = [{ language: 'vue' }];
  formatterRegistration = connection.client.register(DocumentRangeFormattingRequest.type, { documentSelector });
});

let pendingValidationRequests: { [uri: string]: NodeJS.Timer } = {};
const validationDelayMs = 200;

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  triggerValidation(change.document);
});

// a document has closed: clear all diagnostics
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
  const diagnostics: Diagnostic[] = [];
  if (textDocument.languageId === 'vue') {
    languageModes.getAllModesInDocument(textDocument).forEach(mode => {
      if (mode.doValidation && validation[mode.getId()]) {
        pushAll(diagnostics, mode.doValidation(textDocument));
      }
    });
  }
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function pushAll<T>(to: T[], from: T[]) {
  if (from) {
    for (var i = 0; i < from.length; i++) {
      to.push(from[i]);
    }
  }
}

connection.onCompletion(textDocumentPosition => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, textDocumentPosition.position);
  if (mode && mode.doComplete) {
    return mode.doComplete(document, textDocumentPosition.position);
  }
  return { isIncomplete: true, items: [] };
});

connection.onCompletionResolve(item => {
  const data = item.data;
  if (data && data.languageId && data.uri) {
    const mode = languageModes.getMode(data.languageId);
    const document = documents.get(data.uri);
    if (mode && mode.doResolve && document) {
      return mode.doResolve(document, item);
    }
  }
  return item;
});

connection.onHover(textDocumentPosition => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, textDocumentPosition.position);
  if (mode && mode.doHover) {
    return mode.doHover(document, textDocumentPosition.position);
  }
  return null;
});

connection.onDocumentHighlight(documentHighlightParams => {
  const document = documents.get(documentHighlightParams.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, documentHighlightParams.position);
  if (mode && mode.findDocumentHighlight) {
    return mode.findDocumentHighlight(document, documentHighlightParams.position);
  }
  return [];
});

connection.onDefinition(definitionParams => {
  const document = documents.get(definitionParams.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, definitionParams.position);
  if (mode && mode.findDefinition) {
    return mode.findDefinition(document, definitionParams.position);
  }
  return [];
});

connection.onReferences(referenceParams => {
  const document = documents.get(referenceParams.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, referenceParams.position);
  if (mode && mode.findReferences) {
    return mode.findReferences(document, referenceParams.position);
  }
  return [];
});

connection.onSignatureHelp(signatureHelpParms => {
  const document = documents.get(signatureHelpParms.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, signatureHelpParms.position);
  if (mode && mode.doSignatureHelp) {
    return mode.doSignatureHelp(document, signatureHelpParms.position);
  }
  return null;
});

connection.onDocumentRangeFormatting(formatParams => {
  const document = documents.get(formatParams.textDocument.uri);

  const formattingOptions = _.assign({}, formatParams.options, veturFormattingOptions);

  return format(languageModes, document, formatParams.range, formattingOptions);
});

connection.onDocumentLinks(documentLinkParam => {
  const document = documents.get(documentLinkParam.textDocument.uri);
  const documentContext: DocumentContext = {
    resolveReference: ref => {
      if (workspacePath && ref[0] === '/') {
        return uri.file(path.join(workspacePath, ref)).toString();
      }
      return url.resolve(document.uri, ref);
    }
  };
  const links: DocumentLink[] = [];
  languageModes.getAllModesInDocument(document).forEach(m => {
    if (m.findDocumentLinks) {
      pushAll(links, m.findDocumentLinks(document, documentContext));
    }
  });
  return links;
});

connection.onDocumentSymbol(documentSymbolParms => {
  let document = documents.get(documentSymbolParms.textDocument.uri);
  let symbols: SymbolInformation[] = [];
  languageModes.getAllModesInDocument(document).forEach(m => {
    if (m.findDocumentSymbols) {
      pushAll(symbols, m.findDocumentSymbols(document));
    }
  });
  return symbols;
});

// Listen on the connection
connection.listen();