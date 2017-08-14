import {
  TextDocument,
  Diagnostic,
  FormattingOptions,
  Position,
  CompletionList,
  CompletionItem,
  SignatureHelp,
  DocumentHighlight,
  SymbolInformation,
  DocumentLink,
  Definition,
  Location,
  TextEdit,
  Hover,
  Range,
} from 'vscode-languageserver-types';

import { getLanguageModes, LanguageModes } from '../modes/languageModes';
import { NULL_HOVER, NULL_COMPLETION, NULL_SIGNATURE } from '../modes/nullMode';
import { format } from './formatting';

export interface DocumentContext {
  resolveReference(ref: string, base?: string): string;
}

export interface VLS {
  initialize(workspacePath: string): void;
  configure(settings: any): void;
  format(doc: TextDocument, range: Range, formattingOptions: FormattingOptions): TextEdit[];
  validate(doc: TextDocument): Diagnostic[];
  doComplete(doc: TextDocument, position: Position): CompletionList;
  doResolve(doc: TextDocument, languageId: string, item: CompletionItem): CompletionItem;
  doHover(doc: TextDocument, position: Position): Hover;
  doSignatureHelp(doc: TextDocument, position: Position): SignatureHelp;
  findDocumentHighlight(doc: TextDocument, position: Position): DocumentHighlight[];
  findDocumentSymbols(doc: TextDocument): SymbolInformation[];
  findDocumentLinks(doc: TextDocument, documentContext: DocumentContext): DocumentLink[];
  findDefinition(doc: TextDocument, position: Position): Definition;
  findReferences(doc: TextDocument, position: Position): Location[];
  removeDocument(doc: TextDocument): void;
  dispose(): void;
}

export function getVls(): VLS {
  let languageModes: LanguageModes;
  const validation: {[k: string]: boolean} = {
    'vue-html': true,
    html: true,
    css: true,
    scss: true,
    less: true,
    postcss: true,
    javascript: true,
  };

  return {
    initialize(workspacePath) {
      languageModes = getLanguageModes(workspacePath);
    },
    configure(settings) {
      const veturValidationOptions = settings.vetur.validation;
      validation['vue-html'] = veturValidationOptions.template;
      validation.css = veturValidationOptions.style;
      validation.postcss = veturValidationOptions.style;
      validation.scss = veturValidationOptions.style;
      validation.less = veturValidationOptions.style;
      validation.javascript = veturValidationOptions.script;

      languageModes.getAllModes().forEach(m => {
        if (m.configure) {
          m.configure(settings);
        }
      });
    },
    format(doc, range, formattingOptions) {
      return format(languageModes, doc, range, formattingOptions);
    },
    validate(doc) {
      const diagnostics: Diagnostic[] = [];
      if (doc.languageId === 'vue') {
        languageModes.getAllModesInDocument(doc).forEach(mode => {
          if (mode.doValidation && validation[mode.getId()]) {
            pushAll(diagnostics, mode.doValidation(doc));
          }
        });
      }
      return diagnostics;
    },
    doComplete(doc, position) {
      const mode = languageModes.getModeAtPosition(doc, position);
      if (mode) {
        if (mode.doComplete) {
          return mode.doComplete(doc, position);
        }
      }
      return NULL_COMPLETION;
    },
    doResolve(doc, languageId, item) {
      const mode = languageModes.getMode(languageId);
      if (mode && mode.doResolve && doc) {
        return mode.doResolve(doc, item);
      }
      return item;
    },
    doHover(doc, position) {
      const mode = languageModes.getModeAtPosition(doc, position);
      if (mode && mode.doHover) {
        return mode.doHover(doc, position);
      }
      return NULL_HOVER;
    },
    findDocumentHighlight(doc, position) {
      const mode = languageModes.getModeAtPosition(doc, position);
      if (mode && mode.findDocumentHighlight) {
        return mode.findDocumentHighlight(doc, position);
      }
      return [];
    },
    findDefinition(doc, position) {
      const mode = languageModes.getModeAtPosition(doc, position);
      if (mode && mode.findDefinition) {
        return mode.findDefinition(doc, position);
      }
      return [];
    },
    findReferences(doc, position) {
      const mode = languageModes.getModeAtPosition(doc, position);
      if (mode && mode.findReferences) {
        return mode.findReferences(doc, position);
      }
      return [];
    },
    findDocumentLinks(doc, documentContext) {
      const links: DocumentLink[] = [];
      languageModes.getAllModesInDocument(doc).forEach(m => {
        if (m.findDocumentLinks) {
          pushAll(links, m.findDocumentLinks(doc, documentContext));
        }
      });
      return links;
    },
    findDocumentSymbols(doc) {
      const symbols: SymbolInformation[] = [];
      languageModes.getAllModesInDocument(doc).forEach(m => {
        if (m.findDocumentSymbols) {
          pushAll(symbols, m.findDocumentSymbols(doc));
        }
      });
      return symbols;
    },
    doSignatureHelp(doc, position) {
      const mode = languageModes.getModeAtPosition(doc, position);
      if (mode && mode.doSignatureHelp) {
        return mode.doSignatureHelp(doc, position);
      }
      return NULL_SIGNATURE;
    },
    removeDocument(doc) {
      languageModes.onDocumentRemoved(doc);
    },
    dispose() {
      languageModes.dispose();
    }
  };
}

function pushAll<T>(to: T[], from: T[]) {
  if (from) {
    for (let i = 0; i < from.length; i++) {
      to.push(from[i]);
    }
  }
}
