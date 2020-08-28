import { LanguageModelCache, getLanguageModelCache } from '../../embeddedSupport/languageModelCache';
import {
  SymbolInformation,
  CompletionItem,
  Location,
  SignatureHelp,
  SignatureInformation,
  ParameterInformation,
  Definition,
  TextEdit,
  TextDocument,
  Diagnostic,
  DiagnosticSeverity,
  Range,
  CompletionItemKind,
  Hover,
  MarkedString,
  DocumentHighlight,
  DocumentHighlightKind,
  CompletionList,
  Position,
  FormattingOptions,
  DiagnosticTag,
  MarkupContent,
  CodeAction,
  CodeActionKind,
  WorkspaceEdit,
  FoldingRangeKind
} from 'vscode-languageserver-types';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { VueDocumentRegions, LanguageRange } from '../../embeddedSupport/embeddedSupport';
import { prettierify, prettierEslintify, prettierTslintify } from '../../utils/prettier';
import { getFileFsPath, getFilePath } from '../../utils/paths';

import { URI } from 'vscode-uri';
import * as ts from 'typescript';
import * as _ from 'lodash';

import { nullMode, NULL_SIGNATURE } from '../nullMode';
import { VLSFormatConfig } from '../../config';
import { VueInfoService } from '../../services/vueInfoService';
import { getComponentInfo } from './componentInfo';
import { DependencyService, T_TypeScript, State } from '../../services/dependencyService';
import { RefactorAction } from '../../types';
import { IServiceHost } from '../../services/typescriptService/serviceHost';
import { toCompletionItemKind, toSymbolKind } from '../../services/typescriptService/util';
import * as Previewer from './previewer';

// Todo: After upgrading to LS server 4.0, use CompletionContext for filtering trigger chars
// https://microsoft.github.io/language-server-protocol/specification#completion-request-leftwards_arrow_with_hook
const NON_SCRIPT_TRIGGERS = ['<', '*', ':'];

export const APPLY_REFACTOR_COMMAND = 'vetur.applyRefactorCommand';

export async function getJavascriptMode(
  serviceHost: IServiceHost,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  workspacePath: string | undefined,
  vueInfoService?: VueInfoService,
  dependencyService?: DependencyService
): Promise<LanguageMode> {
  if (!workspacePath) {
    return {
      ...nullMode
    };
  }
  const jsDocuments = getLanguageModelCache(10, 60, document => {
    const vueDocument = documentRegions.refreshAndGet(document);
    return vueDocument.getSingleTypeDocument('script');
  });

  const firstScriptRegion = getLanguageModelCache(10, 60, document => {
    const vueDocument = documentRegions.refreshAndGet(document);
    const scriptRegions = vueDocument.getLanguageRangesOfType('script');
    return scriptRegions.length > 0 ? scriptRegions[0] : undefined;
  });

  let tsModule: T_TypeScript = ts;
  if (dependencyService) {
    const tsDependency = dependencyService.getDependency('typescript');
    if (tsDependency && tsDependency.state === State.Loaded) {
      tsModule = tsDependency.module;
    }
  }

  const { updateCurrentVueTextDocument } = serviceHost;
  let config: any = {};
  let supportedCodeFixCodes: Set<number>;

  return {
    getId() {
      return 'javascript';
    },
    configure(c) {
      config = c;
    },
    updateFileInfo(doc: TextDocument): void {
      if (!vueInfoService) {
        return;
      }

      const { service } = updateCurrentVueTextDocument(doc);
      const fileFsPath = getFileFsPath(doc.uri);
      const info = getComponentInfo(tsModule, service, fileFsPath, config);
      if (info) {
        vueInfoService.updateInfo(doc, info);
      }
    },

    doValidation(doc: TextDocument): Diagnostic[] {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const rawScriptDiagnostics = [
        ...service.getSyntacticDiagnostics(fileFsPath),
        ...service.getSemanticDiagnostics(fileFsPath)
      ];

      return rawScriptDiagnostics.map(diag => {
        const tags: DiagnosticTag[] = [];

        if (diag.reportsUnnecessary) {
          tags.push(DiagnosticTag.Unnecessary);
        }

        // syntactic/semantic diagnostic always has start and length
        // so we can safely cast diag to TextSpan
        return <Diagnostic>{
          range: convertRange(scriptDoc, diag as ts.TextSpan),
          severity: convertTSDiagnosticCategoryToDiagnosticSeverity(diag.category),
          message: tsModule.flattenDiagnosticMessageText(diag.messageText, '\n'),
          tags,
          code: diag.code,
          source: 'Vetur'
        };
      });
    },
    doComplete(doc: TextDocument, position: Position): CompletionList {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return { isIncomplete: false, items: [] };
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const offset = scriptDoc.offsetAt(position);
      const triggerChar = doc.getText()[offset - 1];
      if (NON_SCRIPT_TRIGGERS.includes(triggerChar)) {
        return { isIncomplete: false, items: [] };
      }
      const completions = service.getCompletionsAtPosition(fileFsPath, offset, {
        includeCompletionsWithInsertText: true,
        includeCompletionsForModuleExports: _.get(config, ['vetur', 'completion', 'autoImport'])
      });
      if (!completions) {
        return { isIncomplete: false, items: [] };
      }
      const entries = completions.entries.filter(entry => entry.name !== '__vueEditorBridge');
      return {
        isIncomplete: false,
        items: entries.map((entry, index) => {
          const range = entry.replacementSpan && convertRange(scriptDoc, entry.replacementSpan);
          const { label, detail } = calculateLabelAndDetailTextForPathImport(entry);

          return {
            uri: doc.uri,
            position,
            preselect: entry.isRecommended ? true : undefined,
            label,
            detail,
            filterText: getFilterText(entry.insertText),
            sortText: entry.sortText + index,
            kind: toCompletionItemKind(entry.kind),
            textEdit: range && TextEdit.replace(range, entry.name),
            insertText: entry.insertText,
            data: {
              // data used for resolving item details (see 'doResolve')
              languageId: scriptDoc.languageId,
              uri: doc.uri,
              offset,
              source: entry.source
            }
          };
        })
      };

      function calculateLabelAndDetailTextForPathImport(entry: ts.CompletionEntry) {
        // Is import path completion
        if (entry.kind === ts.ScriptElementKind.scriptElement) {
          if (entry.kindModifiers) {
            return {
              label: entry.name,
              detail: entry.name + entry.kindModifiers
            };
          } else {
            if (entry.name.endsWith('.vue')) {
              return {
                label: entry.name.slice(0, -'.vue'.length),
                detail: entry.name
              };
            }
          }
        }

        return {
          label: entry.name,
          detail: undefined
        };
      }
    },
    doResolve(doc: TextDocument, item: CompletionItem): CompletionItem {
      const { service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return item;
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const userPrefs: ts.UserPreferences =
        doc.languageId === 'javascript' ? config.javascript.preferences : config.typescript.preferences;

      const details = service.getCompletionEntryDetails(
        fileFsPath,
        item.data.offset,
        item.label,
        getFormatCodeSettings(config),
        item.data.source,
        userPrefs
      );

      if (details && item.kind !== CompletionItemKind.File && item.kind !== CompletionItemKind.Folder) {
        item.detail = Previewer.plain(tsModule.displayPartsToString(details.displayParts));
        const documentation: MarkupContent = {
          kind: 'markdown',
          value: tsModule.displayPartsToString(details.documentation) + '\n\n'
        };

        if (details.tags) {
          if (details.tags) {
            details.tags.forEach(x => {
              const tagDoc = Previewer.getTagDocumentation(x);
              if (tagDoc) {
                documentation.value += tagDoc;
              }
            });
          }
        }

        if (details.codeActions && config.vetur.completion.autoImport) {
          const textEdits = convertCodeAction(doc, details.codeActions, firstScriptRegion);
          item.additionalTextEdits = textEdits;

          details.codeActions.forEach(action => {
            if (action.description) {
              documentation.value += '\n' + action.description;
            }
          });
        }
        item.documentation = documentation;
        delete item.data;
      }
      return item;
    },
    doHover(doc: TextDocument, position: Position): Hover {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return { contents: [] };
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const info = service.getQuickInfoAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (info) {
        const display = tsModule.displayPartsToString(info.displayParts);
        const markedContents: MarkedString[] = [{ language: 'ts', value: display }];

        let hoverMdDoc = '';
        const doc = Previewer.plain(tsModule.displayPartsToString(info.documentation));
        if (doc) {
          hoverMdDoc += doc + '\n\n';
        }

        if (info.tags) {
          info.tags.forEach(x => {
            const tagDoc = Previewer.getTagDocumentation(x);
            if (tagDoc) {
              hoverMdDoc += tagDoc;
            }
          });
        }

        if (hoverMdDoc.trim() !== '') {
          markedContents.push(hoverMdDoc);
        }

        return {
          range: convertRange(scriptDoc, info.textSpan),
          contents: markedContents
        };
      }
      return { contents: [] };
    },
    doSignatureHelp(doc: TextDocument, position: Position): SignatureHelp | null {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return NULL_SIGNATURE;
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const signatureHelpItems = service.getSignatureHelpItems(fileFsPath, scriptDoc.offsetAt(position), undefined);
      if (!signatureHelpItems) {
        return NULL_SIGNATURE;
      }

      const signatures: SignatureInformation[] = [];
      signatureHelpItems.items.forEach(item => {
        let sigLabel = '';
        let sigMdDoc = '';
        const sigParamemterInfos: ParameterInformation[] = [];

        sigLabel += tsModule.displayPartsToString(item.prefixDisplayParts);
        item.parameters.forEach((p, i, a) => {
          const label = tsModule.displayPartsToString(p.displayParts);
          const parameter: ParameterInformation = {
            label,
            documentation: tsModule.displayPartsToString(p.documentation)
          };
          sigLabel += label;
          sigParamemterInfos.push(parameter);
          if (i < a.length - 1) {
            sigLabel += tsModule.displayPartsToString(item.separatorDisplayParts);
          }
        });
        sigLabel += tsModule.displayPartsToString(item.suffixDisplayParts);

        item.tags
          .filter(x => x.name !== 'param')
          .forEach(x => {
            const tagDoc = Previewer.getTagDocumentation(x);
            if (tagDoc) {
              sigMdDoc += tagDoc;
            }
          });

        signatures.push({
          label: sigLabel,
          documentation: {
            kind: 'markdown',
            value: sigMdDoc
          },
          parameters: sigParamemterInfos
        });
      });

      return {
        activeSignature: signatureHelpItems.selectedItemIndex,
        activeParameter: signatureHelpItems.argumentIndex,
        signatures
      };
    },
    findDocumentHighlight(doc: TextDocument, position: Position): DocumentHighlight[] {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const occurrences = service.getOccurrencesAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (occurrences) {
        return occurrences.map(entry => {
          return {
            range: convertRange(scriptDoc, entry.textSpan),
            kind: entry.isWriteAccess ? DocumentHighlightKind.Write : DocumentHighlightKind.Text
          };
        });
      }
      return [];
    },
    findDocumentSymbols(doc: TextDocument): SymbolInformation[] {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const items = service.getNavigationBarItems(fileFsPath);
      if (!items) {
        return [];
      }
      const result: SymbolInformation[] = [];
      const existing: { [k: string]: boolean } = {};
      const collectSymbols = (item: ts.NavigationBarItem, containerLabel?: string) => {
        const sig = item.text + item.kind + item.spans[0].start;
        if (item.kind !== 'script' && !existing[sig]) {
          const symbol: SymbolInformation = {
            name: item.text,
            kind: toSymbolKind(item.kind),
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
          for (const child of item.childItems) {
            collectSymbols(child, containerLabel);
          }
        }
      };

      items.forEach(item => collectSymbols(item));
      return result;
    },
    findDefinition(doc: TextDocument, position: Position): Definition {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const definitions = service.getDefinitionAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (!definitions) {
        return [];
      }

      const definitionResults: Definition = [];
      const program = service.getProgram();
      if (!program) {
        return [];
      }
      definitions.forEach(d => {
        const definitionTargetDoc = getSourceDoc(d.fileName, program);
        definitionResults.push({
          uri: URI.file(d.fileName).toString(),
          range: convertRange(definitionTargetDoc, d.textSpan)
        });
      });
      return definitionResults;
    },
    findReferences(doc: TextDocument, position: Position): Location[] {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const references = service.getReferencesAtPosition(fileFsPath, scriptDoc.offsetAt(position));
      if (!references) {
        return [];
      }

      const referenceResults: Location[] = [];
      const program = service.getProgram();
      if (!program) {
        return [];
      }
      references.forEach(r => {
        const referenceTargetDoc = getSourceDoc(r.fileName, program);
        if (referenceTargetDoc) {
          referenceResults.push({
            uri: URI.file(r.fileName).toString(),
            range: convertRange(referenceTargetDoc, r.textSpan)
          });
        }
      });
      return referenceResults;
    },
    getFoldingRanges(doc) {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      if (!languageServiceIncludesFile(service, doc.uri)) {
        return [];
      }

      const fileFsPath = getFileFsPath(doc.uri);
      const spans = service.getOutliningSpans(fileFsPath);

      return spans.map(s => {
        const range = convertRange(scriptDoc, s.textSpan);
        const kind = getFoldingRangeKind(s);

        return {
          startLine: range.start.line,
          startCharacter: range.start.character,
          endLine: range.end.line,
          endCharacter: range.end.character,
          kind
        };
      });
    },
    getCodeActions(doc, range, _formatParams, context) {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);
      const fileName = getFileFsPath(scriptDoc.uri);
      const start = scriptDoc.offsetAt(range.start);
      const end = scriptDoc.offsetAt(range.end);
      if (!supportedCodeFixCodes) {
        supportedCodeFixCodes = new Set(
          ts
            .getSupportedCodeFixes()
            .map(Number)
            .filter(x => !isNaN(x))
        );
      }
      const fixableDiagnosticCodes = context.diagnostics.map(d => +d.code!).filter(c => supportedCodeFixCodes.has(c));
      if (!fixableDiagnosticCodes) {
        return [];
      }

      const formatSettings: ts.FormatCodeSettings = getFormatCodeSettings(config);

      const result: CodeAction[] = [];
      const fixes = service.getCodeFixesAtPosition(
        fileName,
        start,
        end,
        fixableDiagnosticCodes,
        formatSettings,
        /*preferences*/ {}
      );
      collectQuickFixCommands(fixes, service, result);

      const textRange = { pos: start, end };
      const refactorings = service.getApplicableRefactors(fileName, textRange, /*preferences*/ {});
      collectRefactoringCommands(refactorings, fileName, formatSettings, textRange, result);

      return result;
    },
    getRefactorEdits(doc: TextDocument, args: RefactorAction): WorkspaceEdit {
      const { service } = updateCurrentVueTextDocument(doc);
      const response = service.getEditsForRefactor(
        args.fileName,
        args.formatOptions,
        args.textRange,
        args.refactorName,
        args.actionName,
        args.preferences
      );
      if (!response) {
        // TODO: What happens when there's no response?
        return {};
      }
      return { changes: createUriMappingForEdits(response.edits, service) };
    },
    format(doc: TextDocument, range: Range, formatParams: FormattingOptions): TextEdit[] {
      const { scriptDoc, service } = updateCurrentVueTextDocument(doc);

      const defaultFormatter =
        scriptDoc.languageId === 'javascript'
          ? config.vetur.format.defaultFormatter.js
          : config.vetur.format.defaultFormatter.ts;

      if (defaultFormatter === 'none') {
        return [];
      }

      const parser = scriptDoc.languageId === 'javascript' ? 'babel' : 'typescript';
      const needInitialIndent = config.vetur.format.scriptInitialIndent;
      const vlsFormatConfig: VLSFormatConfig = config.vetur.format;

      if (
        defaultFormatter === 'prettier' ||
        defaultFormatter === 'prettier-eslint' ||
        defaultFormatter === 'prettier-tslint'
      ) {
        const code = doc.getText(range);
        const filePath = getFileFsPath(scriptDoc.uri);
        let doFormat;
        if (defaultFormatter === 'prettier-eslint') {
          doFormat = prettierEslintify;
        } else if (defaultFormatter === 'prettier-tslint') {
          doFormat = prettierTslintify;
        } else {
          doFormat = prettierify;
        }
        return doFormat(code, filePath, range, vlsFormatConfig, parser, needInitialIndent);
      } else {
        const initialIndentLevel = needInitialIndent ? 1 : 0;
        const formatSettings: ts.FormatCodeSettings =
          scriptDoc.languageId === 'javascript' ? config.javascript.format : config.typescript.format;
        const convertedFormatSettings = convertOptions(
          formatSettings,
          {
            tabSize: vlsFormatConfig.options.tabSize,
            insertSpaces: !vlsFormatConfig.options.useTabs
          },
          initialIndentLevel
        );

        const fileFsPath = getFileFsPath(doc.uri);
        const start = scriptDoc.offsetAt(range.start);
        const end = scriptDoc.offsetAt(range.end);
        const edits = service.getFormattingEditsForRange(fileFsPath, start, end, convertedFormatSettings);

        if (!edits) {
          return [];
        }
        const result = [];
        for (const edit of edits) {
          if (edit.span.start >= start && edit.span.start + edit.span.length <= end) {
            result.push({
              range: convertRange(scriptDoc, edit.span),
              newText: edit.newText
            });
          }
        }
        return result;
      }
    },
    onDocumentRemoved(document: TextDocument) {
      jsDocuments.onDocumentRemoved(document);
    },
    onDocumentChanged(filePath: string) {
      serviceHost.updateExternalDocument(filePath);
    },
    dispose() {
      jsDocuments.dispose();
    }
  };
}

function collectRefactoringCommands(
  refactorings: ts.ApplicableRefactorInfo[],
  fileName: string,
  formatSettings: any,
  textRange: { pos: number; end: number },
  result: CodeAction[]
) {
  const actions: RefactorAction[] = [];
  for (const refactoring of refactorings) {
    const refactorName = refactoring.name;
    if (refactoring.inlineable) {
      actions.push({
        fileName,
        formatOptions: formatSettings,
        textRange,
        refactorName,
        actionName: refactorName,
        preferences: {},
        description: refactoring.description
      });
    } else {
      actions.push(
        ...refactoring.actions.map(action => ({
          fileName,
          formatOptions: formatSettings,
          textRange,
          refactorName,
          actionName: action.name,
          preferences: {},
          description: action.description
        }))
      );
    }
  }
  for (const action of actions) {
    result.push({
      title: action.description,
      kind: CodeActionKind.Refactor,
      command: {
        title: action.description,
        command: APPLY_REFACTOR_COMMAND,
        arguments: [action]
      }
    });
  }
}

function collectQuickFixCommands(
  fixes: ReadonlyArray<ts.CodeFixAction>,
  service: ts.LanguageService,
  result: CodeAction[]
) {
  for (const fix of fixes) {
    const uriTextEditMapping = createUriMappingForEdits(fix.changes, service);
    result.push(createApplyCodeAction(CodeActionKind.QuickFix, fix.description, uriTextEditMapping));
  }
}

function createApplyCodeAction(
  kind: CodeActionKind,
  title: string,
  uriTextEditMapping: Record<string, TextEdit[]>
): CodeAction {
  return {
    title,
    kind,
    edit: {
      changes: uriTextEditMapping
    }
  };
}

function createUriMappingForEdits(changes: ts.FileTextChanges[], service: ts.LanguageService) {
  const program = service.getProgram()!;
  const result: Record<string, TextEdit[]> = {};
  for (const { fileName, textChanges } of changes) {
    const targetDoc = getSourceDoc(fileName, program);
    const edits = textChanges.map(({ newText, span }) => ({
      newText,
      range: convertRange(targetDoc, span)
    }));
    const uri = URI.file(fileName).toString();
    if (result[uri]) {
      result[uri].push(...edits);
    } else {
      result[uri] = edits;
    }
  }
  return result;
}

function getSourceDoc(fileName: string, program: ts.Program): TextDocument {
  const sourceFile = program.getSourceFile(fileName)!;
  return TextDocument.create(fileName, 'vue', 0, sourceFile.getFullText());
}

export function languageServiceIncludesFile(ls: ts.LanguageService, documentUri: string): boolean {
  const filePaths = ls.getProgram()!.getRootFileNames();
  const filePath = getFilePath(documentUri);
  return filePaths.includes(filePath);
}

function convertRange(document: TextDocument, span: ts.TextSpan): Range {
  const startPosition = document.positionAt(span.start);
  const endPosition = document.positionAt(span.start + span.length);
  return Range.create(startPosition, endPosition);
}

function convertOptions(
  formatSettings: ts.FormatCodeSettings,
  options: FormattingOptions,
  initialIndentLevel: number
): ts.FormatCodeSettings {
  return _.assign(formatSettings, {
    convertTabsToSpaces: options.insertSpaces,
    tabSize: options.tabSize,
    indentSize: options.tabSize,
    baseIndentSize: options.tabSize * initialIndentLevel
  });
}

function getFormatCodeSettings(config: any): ts.FormatCodeSettings {
  return {
    tabSize: config.vetur.format.options.tabSize,
    indentSize: config.vetur.format.options.tabSize,
    convertTabsToSpaces: !config.vetur.format.options.useTabs
  };
}

function convertCodeAction(
  doc: TextDocument,
  codeActions: ts.CodeAction[],
  regionStart: LanguageModelCache<LanguageRange | undefined>
): TextEdit[] {
  const scriptStartOffset = doc.offsetAt(regionStart.refreshAndGet(doc)!.start);
  const textEdits: TextEdit[] = [];
  for (const action of codeActions) {
    for (const change of action.changes) {
      textEdits.push(
        ...change.textChanges.map(tc => {
          // currently, only import codeAction is available
          // change start of doc to start of script region
          if (tc.span.start <= scriptStartOffset && tc.span.length === 0) {
            const region = regionStart.refreshAndGet(doc);
            if (region) {
              const line = region.start.line;
              return {
                range: Range.create(line + 1, 0, line + 1, 0),
                newText: tc.newText
              };
            }
          }
          return {
            range: convertRange(doc, tc.span),
            newText: tc.newText
          };
        })
      );
    }
  }
  return textEdits;
}

function convertTSDiagnosticCategoryToDiagnosticSeverity(c: ts.DiagnosticCategory) {
  switch (c) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
    case ts.DiagnosticCategory.Message:
      return DiagnosticSeverity.Information;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
  }
}

/* tslint:disable:max-line-length */
/**
 * Adapted from https://github.com/microsoft/vscode/blob/2b090abd0fdab7b21a3eb74be13993ad61897f84/extensions/typescript-language-features/src/languageFeatures/completions.ts#L147-L181
 */
function getFilterText(insertText: string | undefined): string | undefined {
  // For `this.` completions, generally don't set the filter text since we don't want them to be overly prioritized. #74164
  if (insertText?.startsWith('this.')) {
    return undefined;
  }

  // Handle the case:
  // ```
  // const xyz = { 'ab c': 1 };
  // xyz.ab|
  // ```
  // In which case we want to insert a bracket accessor but should use `.abc` as the filter text instead of
  // the bracketed insert text.
  else if (insertText?.startsWith('[')) {
    return insertText.replace(/^\[['"](.+)[['"]\]$/, '.$1');
  }

  // In all other cases, fallback to using the insertText
  return insertText;
}

function getFoldingRangeKind(span: ts.OutliningSpan): FoldingRangeKind | undefined {
  switch (span.kind) {
    case 'comment':
      return FoldingRangeKind.Comment;
    case 'region':
      return FoldingRangeKind.Region;
    case 'imports':
      return FoldingRangeKind.Imports;
    case 'code':
    default:
      return undefined;
  }
}
