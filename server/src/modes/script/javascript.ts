import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { SymbolInformation, SymbolKind, CompletionItem, Location, SignatureHelp, SignatureInformation, ParameterInformation, Definition, TextEdit, TextDocument, Diagnostic, DiagnosticSeverity, Range, CompletionItemKind, Hover, MarkedString, DocumentHighlight, DocumentHighlightKind, CompletionList, Position, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageMode } from '../languageModes';
import { VueDocumentRegions } from '../embeddedSupport';
import { getFileFsPath, getFilePath } from './preprocess';
import { getServiceHost } from './serviceHost';

import * as ts from 'typescript';
import * as _ from 'lodash';

import { NULL_SIGNATURE, NULL_COMPLETION } from '../nullMode';

export interface ScriptMode extends LanguageMode {
  findComponents(document: TextDocument): string[];
}

export function getJavascriptMode (documentRegions: LanguageModelCache<VueDocumentRegions>, workspacePath: string): ScriptMode {
  const jsDocuments = getLanguageModelCache(10, 60, document => {
    const vueDocument = documentRegions.get(document);
    if (vueDocument.getLanguagesInDocument().indexOf('typescript') > -1) {
      return vueDocument.getEmbeddedDocument('typescript');
    }
    return vueDocument.getEmbeddedDocument('javascript');
  });

  let serviceHost = getServiceHost(workspacePath, jsDocuments);
  let { updateCurrentTextDocument } = serviceHost;
  let settings: any = {};

  return {
    getId () {
      return 'javascript';
    },
    configure (options: any) {
      if (options.vetur) {
        settings.format = options.vetur.format.js;
      }
    },
    doValidation (doc: TextDocument): Diagnostic[] {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const diagnostics = [...service.getSyntacticDiagnostics(fileFsPath),
      ...service.getSemanticDiagnostics(fileFsPath)];

      return diagnostics.map(diag => {
        // syntactic/semantic diagnostic always has start and length
        // so we can safely cast diag to TextSpan
        return {
          range: convertRange(scriptDoc, diag as ts.TextSpan),
          severity: DiagnosticSeverity.Error,
          message: ts.flattenDiagnosticMessageText(diag.messageText, '\n')
        };
      });
    },
    doComplete (doc: TextDocument, position: Position): CompletionList {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return { isIncomplete: false, items: [] };
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const offset = scriptDoc.offsetAt(position);
      const completions = service.getCompletionsAtPosition(fileFsPath, offset);
      if (!completions) {
        return { isIncomplete: false, items: [] };
      }
      const entries = completions.entries.filter(entry => entry.name !== '__vueEditorBridge');
      return {
        isIncomplete: false,
        items: entries.map(entry => {
          const range = entry.replacementSpan && convertRange(scriptDoc, entry.replacementSpan);
          return {
            uri: doc.uri,
            position: position,
            label: entry.name,
            sortText: entry.sortText,
            kind: convertKind(entry.kind),
            textEdit: range ? TextEdit.replace(range, entry.name) : undefined,
            data: { // data used for resolving item details (see 'doResolve')
              languageId: doc.languageId,
              uri: doc.uri,
              offset: offset
            }
          };
        })
      };
    },
    doResolve (doc: TextDocument, item: CompletionItem): CompletionItem {
      let { service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return NULL_COMPLETION;
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const details = service.getCompletionEntryDetails(fileFsPath, item.data.offset, item.label);
      if (details) {
        item.detail = ts.displayPartsToString(details.displayParts);
        item.documentation = ts.displayPartsToString(details.documentation);
        delete item.data;
      }
      return item;
    },
    doHover (doc: TextDocument, position: Position): Hover {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return { contents: [] };
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const info = service.getQuickInfoAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (info) {
        const display = ts.displayPartsToString(info.displayParts);
        const doc = ts.displayPartsToString(info.documentation);
        let markedContents: MarkedString[] = [
          { language: 'ts', value: display }
        ];
        if (doc) {
          markedContents.unshift(doc, '\n');
        }
        return {
          range: convertRange(scriptDoc, info.textSpan),
          contents: markedContents
        };
      }
      return { contents: [] };
    },
    doSignatureHelp (doc: TextDocument, position: Position): SignatureHelp {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return NULL_SIGNATURE;
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const signHelp = service.getSignatureHelpItems(fileFsPath, scriptDoc.offsetAt(position));
      if (!signHelp) {
        return NULL_SIGNATURE;
      }
      const ret: SignatureHelp = {
        activeSignature: signHelp.selectedItemIndex,
        activeParameter: signHelp.argumentIndex,
        signatures: []
      };
      signHelp.items.forEach(item => {

        const signature: SignatureInformation = {
          label: '',
          documentation: undefined,
          parameters: []
        };

        signature.label += ts.displayPartsToString(item.prefixDisplayParts);
        item.parameters.forEach((p, i, a) => {
          const label = ts.displayPartsToString(p.displayParts);
          const parameter: ParameterInformation = {
            label: label,
            documentation: ts.displayPartsToString(p.documentation)
          };
          signature.label += label;
          signature.parameters!.push(parameter);
          if (i < a.length - 1) {
            signature.label += ts.displayPartsToString(item.separatorDisplayParts);
          }
        });
        signature.label += ts.displayPartsToString(item.suffixDisplayParts);
        ret.signatures.push(signature);
      });
      return ret;
    },
    findDocumentHighlight (doc: TextDocument, position: Position): DocumentHighlight[] {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const occurrences = service.getOccurrencesAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (occurrences) {
        return occurrences.map(entry => {
          return {
            range: convertRange(scriptDoc, entry.textSpan),
            kind: <DocumentHighlightKind>(entry.isWriteAccess ? DocumentHighlightKind.Write : DocumentHighlightKind.Text)
          };
        });
      }
      return [];
    },
    findDocumentSymbols (doc: TextDocument): SymbolInformation[] {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const items = service.getNavigationBarItems(fileFsPath);
      if (items) {
        const result: SymbolInformation[] = [];
        const existing: {[k: string]: boolean} = {};
        const collectSymbols = (item: ts.NavigationBarItem, containerLabel?: string) => {
          const sig = item.text + item.kind + item.spans[0].start;
          if (item.kind !== 'script' && !existing[sig]) {
            const symbol: SymbolInformation = {
              name: item.text,
              kind: convertSymbolKind(item.kind),
              location: {
                uri: doc.uri,
                range: convertRange(scriptDoc, item.spans[0])
              },
              containerName: containerLabel
            };
            existing[sig] = true;
            result.push(symbol);
            containerLabel = item.text;
          }

          if (item.childItems && item.childItems.length > 0) {
            for (let child of item.childItems) {
              collectSymbols(child, containerLabel);
            }
          }

        };

        items.forEach(item => collectSymbols(item));
        return result;
      }
      return [];
    },
    findDefinition (doc: TextDocument, position: Position): Definition {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const definition = service.getDefinitionAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (!definition) {
        return [];
      }
      return definition.map(d => {
        return {
          uri: doc.uri,
          range: convertRange(scriptDoc, d.textSpan)
        };
      });
    },
    findReferences (doc: TextDocument, position: Position): Location[] {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const references = service.getReferencesAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (references) {
        return references.map(d => {
          return {
            uri: doc.uri,
            range: convertRange(scriptDoc, d.textSpan)
          };
        });
      }
      return [];
    },
    format (doc: TextDocument, range: Range, formatParams: FormattingOptions): TextEdit[] {
      let { scriptDoc, service } = updateCurrentTextDocument(doc);

      const fileFsPath = getFileFsPath(doc.uri);
      const initialIndentLevel = formatParams.scriptInitialIndent ? 1 : 0;
      const formatSettings = convertOptions(formatParams, settings && settings.format, initialIndentLevel);
      const start = scriptDoc.offsetAt(range.start);
      let end = scriptDoc.offsetAt(range.end);
      const edits = service.getFormattingEditsForRange(fileFsPath, start, end, formatSettings);
      if (edits) {
        const result = [];
        for (let edit of edits) {
          if (edit.span.start >= start && edit.span.start + edit.span.length <= end) {
            result.push({
              range: convertRange(scriptDoc, edit.span),
              newText: edit.newText
            });
          }
        }
        return result;
      }
      return [];
    },
    findComponents(doc: TextDocument) {
      let { service } = updateCurrentTextDocument(doc);
      // TODO: refine component info collection
      const fileFsPath = getFileFsPath(doc.uri);
      const program = service.getProgram();
      const sourceFile = program.getSourceFile(fileFsPath);
      const importStmt = sourceFile.statements.filter(st => st.kind === ts.SyntaxKind.ExportAssignment);
      const instance = (importStmt[0] as ts.ExportAssignment).expression as ts.CallExpression;
      const comp = instance.arguments![0];
      const checker = program.getTypeChecker();
      const compType = checker.getTypeAtLocation(comp);
      const compsSymbol = checker.getPropertyOfType(compType, 'components');
      const comps = checker.getTypeOfSymbolAtLocation(compsSymbol!, compsSymbol!.declarations![0]);
      return checker.getPropertiesOfType(comps).map(s => s.name);
    },
    onDocumentRemoved (document: TextDocument) {
      jsDocuments.onDocumentRemoved(document);
    },
    dispose () {
      serviceHost.getService().dispose();
      jsDocuments.dispose();
    }
  };

}


function languageServiceIncludesFile (ls: ts.LanguageService, documentUri: string): boolean {
  const filePaths = ls.getProgram().getRootFileNames();
  const filePath = getFilePath(documentUri);
  return filePaths.includes(filePath);
}

function convertRange (document: TextDocument, span: ts.TextSpan): Range {
  const startPosition = document.positionAt(span.start);
  const endPosition = document.positionAt(span.start + span.length);
  return Range.create(startPosition, endPosition);
}

function convertKind (kind: string): CompletionItemKind {
  switch (kind) {
    case 'primitive type':
    case 'keyword':
      return CompletionItemKind.Keyword;
    case 'var':
    case 'local var':
      return CompletionItemKind.Variable;
    case 'property':
    case 'getter':
    case 'setter':
      return CompletionItemKind.Field;
    case 'function':
    case 'method':
    case 'construct':
    case 'call':
    case 'index':
      return CompletionItemKind.Function;
    case 'enum':
      return CompletionItemKind.Enum;
    case 'module':
      return CompletionItemKind.Module;
    case 'class':
      return CompletionItemKind.Class;
    case 'interface':
      return CompletionItemKind.Interface;
    case 'warning':
      return CompletionItemKind.File;
  }

  return CompletionItemKind.Property;
}

function convertSymbolKind (kind: string): SymbolKind {
  switch (kind) {
    case 'var':
    case 'local var':
    case 'const':
      return SymbolKind.Variable;
    case 'function':
    case 'local function':
      return SymbolKind.Function;
    case 'enum':
      return SymbolKind.Enum;
    case 'module':
      return SymbolKind.Module;
    case 'class':
      return SymbolKind.Class;
    case 'interface':
      return SymbolKind.Interface;
    case 'method':
      return SymbolKind.Method;
    case 'property':
    case 'getter':
    case 'setter':
      return SymbolKind.Property;
  }
  return SymbolKind.Variable;
}

function convertOptions (options: FormattingOptions, formatSettings: any, initialIndentLevel: number): ts.FormatCodeOptions {
  const defaultJsFormattingOptions = {
    ConvertTabsToSpaces: options.insertSpaces,
    TabSize: options.tabSize,
    IndentSize: options.tabSize,
    IndentStyle: ts.IndentStyle.Smart,
    NewLineCharacter: '\n',
    BaseIndentSize: options.tabSize * initialIndentLevel,
    InsertSpaceAfterCommaDelimiter: true,
    InsertSpaceAfterSemicolonInForStatements: true,
    InsertSpaceAfterKeywordsInControlFlowStatements: true,
    InsertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
    InsertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
    InsertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
    InsertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
    InsertSpaceBeforeFunctionParenthesis: true,
    InsertSpaceBeforeAndAfterBinaryOperators: true,
    PlaceOpenBraceOnNewLineForControlBlocks: false,
    PlaceOpenBraceOnNewLineForFunctions: false
  };

  return _.assign(defaultJsFormattingOptions, formatSettings);
}
