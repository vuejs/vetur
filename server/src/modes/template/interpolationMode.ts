import {
  CompletionItem,
  CompletionList,
  Definition,
  Diagnostic,
  DiagnosticSeverity,
  Location,
  MarkedString,
  MarkupContent,
  Position,
  Range,
  TextEdit
} from 'vscode-languageserver-types';
import { URI } from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { VLSFullConfig } from '../../config';
import { LanguageModelCache } from '../../embeddedSupport/languageModelCache';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { IServiceHost } from '../../services/typescriptService/serviceHost';
import { mapBackRange, mapFromPositionToOffset } from '../../services/typescriptService/sourceMap';
import type ts from 'typescript';
import _ from 'lodash';
import { createTemplateDiagnosticFilter } from '../../services/typescriptService/templateDiagnosticFilter';
import { toCompletionItemKind } from '../../services/typescriptService/util';
import { VueInfoService } from '../../services/vueInfoService';
import { isVCancellationRequested, VCancellationToken } from '../../utils/cancellationToken';
import { getFileFsPath } from '../../utils/paths';
import { NULL_COMPLETION } from '../nullMode';
import { getFormatCodeSettings, languageServiceIncludesFile } from '../script/javascript';
import * as Previewer from '../script/previewer';
import { HTMLDocument } from './parser/htmlParser';
import { isInsideInterpolation } from './services/isInsideInterpolation';
import { RuntimeLibrary } from '../../services/dependencyService';
import { EnvironmentService } from '../../services/EnvironmentService';

export class VueInterpolationMode implements LanguageMode {
  constructor(
    private tsModule: RuntimeLibrary['typescript'],
    private serviceHost: IServiceHost,
    private env: EnvironmentService,
    private vueDocuments: LanguageModelCache<HTMLDocument>,
    private vueInfoService?: VueInfoService
  ) {}

  getId() {
    return 'vue-html-interpolation';
  }

  queryVirtualFileInfo(fileName: string, currFileText: string) {
    return this.serviceHost.queryVirtualFileInfo(fileName, currFileText);
  }

  private getChildComponents(document: TextDocument) {
    return this.env.getConfig().vetur.validation.templateProps
      ? this.vueInfoService && this.vueInfoService.getInfo(document)?.componentInfo.childComponents
      : [];
  }

  async doValidation(document: TextDocument, cancellationToken?: VCancellationToken): Promise<Diagnostic[]> {
    if (
      !this.env.getConfig().vetur.experimental.templateInterpolationService ||
      !this.env.getConfig().vetur.validation.interpolation
    ) {
      return [];
    }

    if (await isVCancellationRequested(cancellationToken)) {
      return [];
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(
      templateDoc,
      this.getChildComponents(document)
    );

    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return [];
    }

    if (await isVCancellationRequested(cancellationToken)) {
      return [];
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    // We don't need syntactic diagnostics because
    // compiled template is always valid JavaScript syntax.
    const rawTemplateDiagnostics = templateService.getSemanticDiagnostics(templateFileFsPath);
    const templateDiagnosticFilter = createTemplateDiagnosticFilter(this.tsModule);

    return rawTemplateDiagnostics.filter(templateDiagnosticFilter).map(diag => {
      // syntactic/semantic diagnostic always has start and length
      // so we can safely cast diag to TextSpan
      return {
        range: mapBackRange(templateDoc, diag as ts.TextSpan, templateSourceMap),
        severity: DiagnosticSeverity.Error,
        message: this.tsModule.flattenDiagnosticMessageText(diag.messageText, '\n'),
        code: diag.code,
        source: 'Vetur'
      };
    });
  }

  doComplete(document: TextDocument, position: Position): CompletionList {
    if (!this.env.getConfig().vetur.experimental.templateInterpolationService) {
      return NULL_COMPLETION;
    }

    const offset = document.offsetAt(position);
    const node = this.vueDocuments.refreshAndGet(document).findNodeBefore(offset);
    const nodeRange = Range.create(document.positionAt(node.start), document.positionAt(node.end));
    const nodeText = document.getText(nodeRange);
    if (!isInsideInterpolation(node, nodeText, offset - node.start)) {
      return NULL_COMPLETION;
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(
      templateDoc,
      this.getChildComponents(document)
    );
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return NULL_COMPLETION;
    }

    /**
     * In the cases of empty content inside node
     * For example, completion in {{ | }}
     * Source map would only map this position {{|  }}
     * And position mapped back wouldn't fall into any source map ranges
     */
    let completionPos = position;
    // Case {{ }}
    if (node.isInterpolation) {
      if (nodeText.match(/{{\s*}}/)) {
        completionPos = document.positionAt(node.start + '{{'.length);
      }
    }
    // Todo: Case v-, : or @ directives

    const mappedOffset = mapFromPositionToOffset(templateDoc, completionPos, templateSourceMap);
    const templateFileFsPath = getFileFsPath(templateDoc.uri);

    /**
     * A lot of times interpolation expressions aren't valid
     * TODO: Make sure interpolation expression, even incomplete, can generate incomplete
     * TS files that can be fed into language service
     */
    let completions: ts.WithMetadata<ts.CompletionInfo> | undefined;
    try {
      completions = templateService.getCompletionsAtPosition(templateFileFsPath, mappedOffset, {
        includeCompletionsWithInsertText: true,
        includeCompletionsForModuleExports: false
      });
    } catch (err) {
      console.log('Interpolation completion failed');
      console.error(err.stack);
    }

    if (!completions) {
      return NULL_COMPLETION;
    }

    const tsItems = completions!.entries.map((entry, index) => {
      return {
        uri: templateDoc.uri,
        position,
        label: entry.name,
        sortText: entry.name.startsWith('$') ? '1' + entry.sortText : '0' + entry.sortText,
        kind: toCompletionItemKind(entry.kind),
        textEdit:
          entry.replacementSpan &&
          TextEdit.replace(mapBackRange(templateDoc, entry.replacementSpan, templateSourceMap), entry.name),
        data: {
          // data used for resolving item details (see 'doResolve')
          languageId: 'vue-html',
          uri: templateDoc.uri,
          offset: position,
          source: entry.source,
          tsData: entry.data
        }
      };
    });

    return {
      isIncomplete: false,
      items: tsItems
    };
  }

  doResolve(document: TextDocument, item: CompletionItem): CompletionItem {
    if (!this.env.getConfig().vetur.experimental.templateInterpolationService) {
      return item;
    }

    /**
     * resolve is called for both HTMl and interpolation completions
     * HTML completions send back no data
     */
    if (!item.data) {
      return item;
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(
      templateDoc,
      this.getChildComponents(document)
    );
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return item;
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    const mappedOffset = mapFromPositionToOffset(templateDoc, item.data.offset, templateSourceMap);

    const details = templateService.getCompletionEntryDetails(
      templateFileFsPath,
      mappedOffset,
      item.label,
      undefined,
      undefined,
      undefined,
      undefined
    );

    if (details) {
      item.detail = Previewer.plain(this.tsModule.displayPartsToString(details.displayParts));

      const documentation: MarkupContent = {
        kind: 'markdown',
        value: this.tsModule.displayPartsToString(details.documentation) + '\n\n'
      };

      if (details.tags) {
        if (details.tags) {
          details.tags.forEach(x => {
            const tagDoc = Previewer.getTagDocumentation(x);
            if (tagDoc) {
              documentation.value += tagDoc + '\n\n';
            }
          });
        }
      }

      item.documentation = documentation;
      delete item.data;
    }
    return item;
  }

  doHover(
    document: TextDocument,
    position: Position
  ): {
    contents: MarkedString[];
    range?: Range;
  } {
    if (!this.env.getConfig().vetur.experimental.templateInterpolationService) {
      return { contents: [] };
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(
      templateDoc,
      this.getChildComponents(document)
    );
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return {
        contents: []
      };
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    const mappedPosition = mapFromPositionToOffset(templateDoc, position, templateSourceMap);

    const info = templateService.getQuickInfoAtPosition(templateFileFsPath, mappedPosition);
    if (info) {
      const display = this.tsModule.displayPartsToString(info.displayParts);
      const markedContents: MarkedString[] = [{ language: 'ts', value: display }];

      let hoverMdDoc = '';
      const doc = Previewer.plain(this.tsModule.displayPartsToString(info.documentation));
      if (doc) {
        hoverMdDoc += doc + '\n\n';
      }

      if (info.tags) {
        info.tags.forEach(x => {
          const tagDoc = Previewer.getTagDocumentation(x);
          if (tagDoc) {
            hoverMdDoc += tagDoc + '\n\n';
          }
        });
      }

      if (hoverMdDoc.trim() !== '') {
        markedContents.push(hoverMdDoc);
      }

      return {
        range: mapBackRange(templateDoc, info.textSpan, templateSourceMap),
        contents: markedContents
      };
    }
    return { contents: [] };
  }

  findDefinition(document: TextDocument, position: Position): Location[] {
    if (!this.env.getConfig().vetur.experimental.templateInterpolationService) {
      return [];
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(
      templateDoc,
      this.getChildComponents(document)
    );
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return [];
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    const mappedPosition = mapFromPositionToOffset(templateDoc, position, templateSourceMap);
    const definitions = templateService.getDefinitionAtPosition(templateFileFsPath, mappedPosition);
    if (!definitions) {
      return [];
    }

    const definitionResults: Definition = [];
    const program = templateService.getProgram();
    if (!program) {
      return [];
    }

    definitions.forEach(r => {
      const definitionTargetDoc = r.fileName === templateFileFsPath ? document : getSourceDoc(r.fileName, program);
      if (definitionTargetDoc) {
        const range =
          r.fileName === templateFileFsPath
            ? mapBackRange(templateDoc, r.textSpan, templateSourceMap)
            : convertRange(definitionTargetDoc, r.textSpan);

        definitionResults.push({
          uri: URI.file(definitionTargetDoc.uri).toString(),
          range
        });
      }
    });
    return definitionResults;
  }

  findReferences(document: TextDocument, position: Position): Location[] {
    if (!this.env.getConfig().vetur.experimental.templateInterpolationService) {
      return [];
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(
      templateDoc,
      this.getChildComponents(document)
    );
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return [];
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    const mappedPosition = mapFromPositionToOffset(templateDoc, position, templateSourceMap);
    const references = templateService.getReferencesAtPosition(templateFileFsPath, mappedPosition);
    if (!references) {
      return [];
    }

    const referenceResults: Location[] = [];
    const program = templateService.getProgram();
    if (!program) {
      return [];
    }

    references.forEach(r => {
      const referenceTargetDoc = r.fileName === templateFileFsPath ? document : getSourceDoc(r.fileName, program);
      if (referenceTargetDoc) {
        const range =
          r.fileName === templateFileFsPath
            ? mapBackRange(templateDoc, r.textSpan, templateSourceMap)
            : convertRange(referenceTargetDoc, r.textSpan);

        referenceResults.push({
          uri: URI.file(referenceTargetDoc.uri).toString(),
          range
        });
      }
    });
    return referenceResults;
  }

  onDocumentRemoved() {}

  dispose() {}
}

function getSourceDoc(fileName: string, program: ts.Program): TextDocument {
  const sourceFile = program.getSourceFile(fileName)!;
  return TextDocument.create(fileName, 'vue', 0, sourceFile.getFullText());
}

function convertRange(document: TextDocument, span: ts.TextSpan): Range {
  const startPosition = document.positionAt(span.start);
  const endPosition = document.positionAt(span.start + span.length);
  return Range.create(startPosition, endPosition);
}
