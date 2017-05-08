import { LanguageModelCache, getLanguageModelCache } from '../languageModelCache';
import { SymbolInformation, SymbolKind, CompletionItem, Location, SignatureHelp, SignatureInformation, ParameterInformation, Definition, TextEdit, TextDocument, Diagnostic, DiagnosticSeverity, Range, CompletionItemKind, Hover, MarkedString, DocumentHighlight, DocumentHighlightKind, CompletionList, Position, FormattingOptions } from 'vscode-languageserver-types';
import { LanguageMode } from './languageModes';
import { getWordAtText, isWhitespaceOnly, repeat } from '../utils/strings';
import { HTMLDocumentRegions } from './embeddedSupport';
import { createUpdater, parseVue, isVue } from './typescriptMode';

import Uri from 'vscode-uri';
import * as path from 'path';
import * as ts from 'typescript';
import * as _ from 'lodash';
import { platform } from 'os';

const IS_WINDOWS = platform() === 'win32';
const JS_WORD_REGEX = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;

export function getJavascriptMode(documentRegions: LanguageModelCache<HTMLDocumentRegions>, workspacePath: string): LanguageMode {
  const jsDocuments = getLanguageModelCache<TextDocument>(10, 60, document => {
    const vueDocument = documentRegions.get(document);
    if (vueDocument.getLanguagesInDocument().indexOf('typescript') > -1) {
      return vueDocument.getEmbeddedDocument('typescript');
    }
    return vueDocument.getEmbeddedDocument('javascript');
  });

  let compilerOptions: ts.CompilerOptions = {
    allowNonTsExtensions: true,
    allowJs: true,
    lib: ['lib.dom.d.ts', 'lib.es2017.d.ts'],
    target: ts.ScriptTarget.Latest,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.CommonJS,
    allowSyntheticDefaultImports: true
  };
  let currentTextDocument: TextDocument;
  let versions = new Map<string, number>();
  let docs = new Map<string, TextDocument>();

  function updateCurrentTextDocument(doc: TextDocument) {
    if (!currentTextDocument || doc.uri !== currentTextDocument.uri || doc.version !== currentTextDocument.version) {
      currentTextDocument = jsDocuments.get(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (docs.has(filePath) && currentTextDocument.languageId !== docs.get(filePath).languageId) {
        // if languageId changed, we must restart the language service; it can't handle file type changes
        compilerOptions.allowJs = docs.get(filePath).languageId !== 'typescript';
        jsLanguageService.dispose();
        jsLanguageService = ts.createLanguageService(host);
      }
      docs.set(filePath, currentTextDocument);
      versions.set(filePath, (versions.get(filePath) || 0) + 1);
    }
  }

  // Patch typescript functions to insert `import Vue from 'vue'` and `new Vue` around export default.
  // NOTE: Typescript 2.3 should add an API to allow this, and then this code should use that API.
  const { createLanguageServiceSourceFile, updateLanguageServiceSourceFile } = createUpdater();
  (ts as any).createLanguageServiceSourceFile = createLanguageServiceSourceFile;
  (ts as any).updateLanguageServiceSourceFile = updateLanguageServiceSourceFile;
  const configFilename = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'tsconfig.json') ||
    ts.findConfigFile(workspacePath, ts.sys.fileExists, 'jsconfig.json');
  const configJson = configFilename && ts.readConfigFile(configFilename, ts.sys.readFile).config || {
    exclude: ['node_modules', '**/node_modules/*']
  };
  const parsedConfig = ts.parseJsonConfigFileContent(configJson,
    ts.sys,
    workspacePath,
    compilerOptions,
    configFilename,
    undefined,
    [{ extension: 'vue', isMixedContent: true }]);
  const files = parsedConfig.fileNames;
  compilerOptions = parsedConfig.options;
  compilerOptions.allowNonTsExtensions = true;

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => files,
    getScriptVersion(filename) {
      const fileFsPath = getFileFsPath(filename);
      return versions.has(fileFsPath) ? versions.get(fileFsPath).toString() : '0';
    },
    getScriptKind(fileName) {
      if (isVue(fileName)) {
        const uri = Uri.file(fileName);
        fileName = uri.fsPath;
        const doc = docs.get(fileName) ||
          jsDocuments.get(TextDocument.create(uri.toString(), 'vue', 0, ts.sys.readFile(fileName)));
        return doc.languageId === 'typescript' ? ts.ScriptKind.TS : ts.ScriptKind.JS;
      }
      else {
        // NOTE: Typescript 2.3 should export getScriptKindFromFileName. Then this cast should be removed.
        return (ts as any).getScriptKindFromFileName(fileName);
      }
    },
    resolveModuleNames(moduleNames: string[], containingFile: string): ts.ResolvedModule[] {
      // in the normal case, delegate to ts.resolveModuleName
      // in the relative-imported.vue case, manually build a resolved filename
      return moduleNames.map(name => {
        if (path.isAbsolute(name) || !isVue(name)) {
          return ts.resolveModuleName(name, containingFile, compilerOptions, ts.sys).resolvedModule;
        }
        else {
          const uri = Uri.file(path.join(path.dirname(containingFile), name));
          const resolvedFileName = uri.fsPath;
          if (ts.sys.fileExists(resolvedFileName)) {
            const doc = docs.get(resolvedFileName) ||
              jsDocuments.get(TextDocument.create(uri.toString(), 'vue', 0, ts.sys.readFile(resolvedFileName)));
            return {
              resolvedFileName,
              extension: doc.languageId === 'typescript' ? ts.Extension.Ts : ts.Extension.Js,
            };
          }
        }
      });
    },
    getScriptSnapshot: (fileName: string) => {
      const fileFsPath = getFileFsPath(fileName);
      let text = docs.has(fileFsPath) ? docs.get(fileFsPath).getText() : (ts.sys.readFile(fileFsPath) || '');
      if (isVue(fileName)) {
        // Note: This is required in addition to the parsing in embeddedSupport because
        // this works for .vue files that aren't even loaded by VS Code yet.
        text = parseVue(text);
      }
      return {
        getText: (start, end) => text.substring(start, end),
        getLength: () => text.length,
        getChangeRange: () => void 0
      };
    },
    getCurrentDirectory: () => workspacePath,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
  };

  let jsLanguageService = ts.createLanguageService(host);
  let settings: any = {};

  return {
    getId() {
      return 'javascript';
    },
    configure(options: any) {
      if (options.vetur) {
        settings.format = options.vetur.format.js;
      }
    },
    doValidation(doc: TextDocument): Diagnostic[] {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return [];
      }

      const diagnostics = [...jsLanguageService.getSyntacticDiagnostics(filePath),
                           ...jsLanguageService.getSemanticDiagnostics(filePath)];

      return diagnostics.map(diag => {
        return {
          range: convertRange(currentTextDocument, diag),
          severity: DiagnosticSeverity.Error,
          message: ts.flattenDiagnosticMessageText(diag.messageText, '\n')
        };
      });
    },
    doComplete(doc: TextDocument, position: Position): CompletionList {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return { isIncomplete: false, items: [] };
      }

      let offset = currentTextDocument.offsetAt(position);
      let completions = jsLanguageService.getCompletionsAtPosition(filePath, offset);
      if (!completions) {
        return { isIncomplete: false, items: [] };
      }
      let replaceRange = convertRange(currentTextDocument, getWordAtText(currentTextDocument.getText(), offset, JS_WORD_REGEX));
      return {
        isIncomplete: false,
        items: completions.entries.map(entry => {
          return {
            uri: doc.uri,
            position: position,
            label: entry.name,
            sortText: entry.sortText,
            kind: convertKind(entry.kind),
            textEdit: TextEdit.replace(replaceRange, entry.name),
            data: { // data used for resolving item details (see 'doResolve')
              languageId: 'javascript',
              uri: doc.uri,
              offset: offset
            }
          };
        })
      };
    },
    doResolve(doc: TextDocument, item: CompletionItem): CompletionItem {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return null;
      }

      const details = jsLanguageService.getCompletionEntryDetails(filePath, item.data.offset, item.label);
      if (details) {
        item.detail = ts.displayPartsToString(details.displayParts);
        item.documentation = ts.displayPartsToString(details.documentation);
        delete item.data;
      }
      return item;
    },
    doHover(doc: TextDocument, position: Position): Hover {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return null;
      }

      const info = jsLanguageService.getQuickInfoAtPosition(filePath, currentTextDocument.offsetAt(position));
      if (info) {
        const contents = ts.displayPartsToString(info.displayParts);
        return {
          range: convertRange(currentTextDocument, info.textSpan),
          contents: MarkedString.fromPlainText(contents)
        };
      }
      return null;
    },
    doSignatureHelp(doc: TextDocument, position: Position): SignatureHelp {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return null;
      }

      const signHelp = jsLanguageService.getSignatureHelpItems(filePath, currentTextDocument.offsetAt(position));
      if (signHelp) {
        const ret: SignatureHelp = {
          activeSignature: signHelp.selectedItemIndex,
          activeParameter: signHelp.argumentIndex,
          signatures: []
        };
        signHelp.items.forEach(item => {

          const signature: SignatureInformation = {
            label: '',
            documentation: null,
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
            signature.parameters.push(parameter);
            if (i < a.length - 1) {
              signature.label += ts.displayPartsToString(item.separatorDisplayParts);
            }
          });
          signature.label += ts.displayPartsToString(item.suffixDisplayParts);
          ret.signatures.push(signature);
        });
        return ret;
      };
      return null;
    },
    findDocumentHighlight(doc: TextDocument, position: Position): DocumentHighlight[] {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return [];
      }

      const occurrences = jsLanguageService.getOccurrencesAtPosition(filePath, currentTextDocument.offsetAt(position));
      if (occurrences) {
        return occurrences.map(entry => {
          return {
            range: convertRange(currentTextDocument, entry.textSpan),
            kind: <DocumentHighlightKind>(entry.isWriteAccess ? DocumentHighlightKind.Write : DocumentHighlightKind.Text)
          };
        });
      };
      return [];
    },
    findDocumentSymbols(doc: TextDocument): SymbolInformation[] {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return [];
      }

      const items = jsLanguageService.getNavigationBarItems(filePath);
      if (items) {
        const result: SymbolInformation[] = [];
        const existing = {};
        const collectSymbols = (item: ts.NavigationBarItem, containerLabel?: string) => {
          const sig = item.text + item.kind + item.spans[0].start;
          if (item.kind !== 'script' && !existing[sig]) {
            const symbol: SymbolInformation = {
              name: item.text,
              kind: convertSymbolKind(item.kind),
              location: {
                uri: doc.uri,
                range: convertRange(currentTextDocument, item.spans[0])
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
    findDefinition(doc: TextDocument, position: Position): Definition {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return null;
      }

      const definition = jsLanguageService.getDefinitionAtPosition(filePath, currentTextDocument.offsetAt(position));
      if (definition) {
        return definition.map(d => {
          return {
            uri: doc.uri,
            range: convertRange(currentTextDocument, d.textSpan)
          };
        });
      }
      return null;
    },
    findReferences(doc: TextDocument, position: Position): Location[] {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return [];
      }

      const references = jsLanguageService.getReferencesAtPosition(filePath, currentTextDocument.offsetAt(position));
      if (references) {
        return references.map(d => {
          return {
            uri: doc.uri,
            range: convertRange(currentTextDocument, d.textSpan)
          };
        });
      }
      return [];
    },
    format(doc: TextDocument, range: Range, formatParams: FormattingOptions): TextEdit[] {
      updateCurrentTextDocument(doc);
      const filePath = Uri.parse(doc.uri).path;
      if (!languageServiceIncludesFile(jsLanguageService, doc.uri)) {
        return [];
      }

      const initialIndentLevel = computeInitialIndent(doc, range, formatParams);
      const formatSettings = convertOptions(formatParams, settings && settings.format, initialIndentLevel);
      const start = currentTextDocument.offsetAt(range.start);
      let end = currentTextDocument.offsetAt(range.end);
      let lastLineRange = null;
      if (range.end.character === 0 || isWhitespaceOnly(currentTextDocument.getText().substr(end - range.end.character, range.end.character))) {
        end -= range.end.character;
        lastLineRange = Range.create(Position.create(range.end.line, 0), range.end);
      }
      const edits = jsLanguageService.getFormattingEditsForRange(filePath, start, end, formatSettings);
      if (edits) {
        const result = [];
        for (let edit of edits) {
          if (edit.span.start >= start && edit.span.start + edit.span.length <= end) {
            result.push({
              range: convertRange(currentTextDocument, edit.span),
              newText: edit.newText
            });
          }
        }
        if (lastLineRange) {
          result.push({
            range: lastLineRange,
            newText: generateIndent(initialIndentLevel, formatParams)
          });
        }
        return result;
      }
      return [];
    },
    onDocumentRemoved(document: TextDocument) {
      jsDocuments.onDocumentRemoved(document);
    },
    dispose() {
      jsLanguageService.dispose();
      jsDocuments.dispose();
    }
  };
};

function getFileFsPath(fileName: string): string {
  return Uri.file(fileName).fsPath;
}

function languageServiceIncludesFile(ls: ts.LanguageService, documentUri: string): boolean {
  const filePaths = ls.getProgram().getRootFileNames();
  if (IS_WINDOWS) {
    // Windows have a leading slash like /C:/Users/pine
    const winFilePath = Uri.parse(documentUri).path.slice(1);
    return filePaths.includes(winFilePath);
  } else {
    const filePath = Uri.parse(documentUri).path;
    return filePaths.includes(filePath);
  }
}

function convertRange(document: TextDocument, span: { start: number, length: number }): Range {
  const startPosition = document.positionAt(span.start);
  const endPosition = document.positionAt(span.start + span.length);
  return Range.create(startPosition, endPosition);
}

function convertKind(kind: string): CompletionItemKind {
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

function convertSymbolKind(kind: string): SymbolKind {
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

function convertOptions(options: FormattingOptions, formatSettings: any, initialIndentLevel: number): ts.FormatCodeOptions {
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

function computeInitialIndent(document: TextDocument, range: Range, options: FormattingOptions) {
  const lineStart = document.offsetAt(Position.create(range.start.line, 0));
  const content = document.getText();

  const tabSize = options.tabSize || 2;
  let i = lineStart;
  let nChars = 0;
  while (i < content.length) {
    let ch = content.charAt(i);
    if (ch === ' ') {
      nChars++;
    } else if (ch === '\t') {
      nChars += tabSize;
    } else {
      break;
    }
    i++;
  }
  return Math.floor(nChars / tabSize);
}

function generateIndent(level: number, options: FormattingOptions) {
  if (options.insertSpaces) {
    return repeat(' ', level * options.tabSize);
  } else {
    return repeat('\t', level);
  }
}