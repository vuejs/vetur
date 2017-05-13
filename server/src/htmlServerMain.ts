import { createConnection, IConnection, TextDocuments, InitializeParams, InitializeResult, DocumentRangeFormattingRequest, Disposable, DocumentSelector } from 'vscode-languageserver';
import { TextDocument, Diagnostic, DocumentLink, SymbolInformation } from 'vscode-languageserver-types';
import Uri from 'vscode-uri';
import { DocumentContext, getVls } from 'vetur-vls';
import * as url from 'url';
import * as path from 'path';
import * as _ from 'lodash';

import { getLanguageModes, LanguageModes } from './modes/languageModes';
import { format } from './modes/formatting';

// Create a connection for the server
const connection: IConnection = createConnection();

console.log = connection.console.log.bind(connection.console);
console.error = connection.console.error.bind(connection.console);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents: TextDocuments = new TextDocuments();
// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

let workspacePath: string;
let languageModes: LanguageModes;
let settings: any = {};

let veturFormattingOptions: any = {};

// After the server has started the client sends an initilize request. The server receives
// in the passed params the rootPath of the workspace plus the client capabilites
connection.onInitialize((params: InitializeParams): InitializeResult => {
  console.log('vetur initialized');
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
      documentRangeFormattingProvider: false,
      hoverProvider: true,
    }
  };
});

const validation = {
  'vue-html': true,
  html: true,
  css: true,
  scss: true,
  less: true,
  javascript: true,
};

let formatterRegistration: Thenable<Disposable>;

// The settings have changed. Is send on server activation as well.
connection.onDidChangeConfiguration((change) => {
  settings = change.settings;

  // Update formatting setting
  veturFormattingOptions = settings.vetur.format;

  const veturValidationOptions = settings.vetur.validation;
  validation.css = veturValidationOptions.style;
  validation.scss = veturValidationOptions.style;
  validation.less = veturValidationOptions.style;
  validation.javascript = veturValidationOptions.script;

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

// When the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  triggerValidation(change.document);
});

// A document has closed: clear all diagnostics
documents.onDidClose(event => {
  cleanPendingValidation(event.document);
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

function cleanPendingValidation (textDocument: TextDocument): void {
  const request = pendingValidationRequests[textDocument.uri];
  if (request) {
    clearTimeout(request);
    delete pendingValidationRequests[textDocument.uri];
  }
}

function triggerValidation (textDocument: TextDocument): void {
  cleanPendingValidation(textDocument);
  pendingValidationRequests[textDocument.uri] = setTimeout(() => {
    delete pendingValidationRequests[textDocument.uri];
    validateTextDocument(textDocument);
  }, validationDelayMs);
}

function validateTextDocument (textDocument: TextDocument): void {
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
    for (let i = 0; i < from.length; i++) {
      to.push(from[i]);
    }
  }
}

connection.onCompletion(textDocumentPosition => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  const mode = languageModes.getModeAtPosition(document, textDocumentPosition.position);

  if (mode && mode.doComplete) {
    return mode.doComplete(document, textDocumentPosition.position);
  } else {
    return getVls().doVueComplete();
  }
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
        return Uri.file(path.join(workspacePath, ref)).toString();
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