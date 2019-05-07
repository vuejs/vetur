import { LanguageMode } from '../../embeddedSupport/languageModes';
import {
  Diagnostic,
  TextDocument,
  DiagnosticSeverity,
  Position,
  MarkedString,
  Range,
  Location,
  Definition
} from 'vscode-languageserver-types';
import { IServiceHost } from '../../services/typescriptService/serviceHost';
import { languageServiceIncludesFile } from '../script/javascript';
import { getFileFsPath } from '../../utils/paths';
import { mapBackRange, mapFromPositionToOffset } from '../../services/typescriptService/sourceMap';
import * as ts from 'typescript';
import { T_TypeScript } from '../../services/dependencyService';
import * as _ from 'lodash';
import { createTemplateDiagnosticFilter } from '../../services/typescriptService/templateDiagnosticFilter';

export class VueInterpolationMode implements LanguageMode {
  private config: any = {};

  constructor(private tsModule: T_TypeScript, private serviceHost: IServiceHost) {}

  getId() {
    return 'vue-html-interpolation';
  }

  configure(c: any) {
    this.config = c;
  }

  queryVirtualFileInfo(fileName: string, currFileText: string) {
    return this.serviceHost.queryVirtualFileInfo(fileName, currFileText);
  }

  doValidation(document: TextDocument): Diagnostic[] {
    if (!_.get(this.config, ['vetur', 'experimental', 'templateInterpolationService'], true)) {
      return [];
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(templateDoc);
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
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
        message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
        code: diag.code,
        source: 'Vetur'
      };
    });
  }

  doHover(
    document: TextDocument,
    position: Position
  ): {
    contents: MarkedString[];
    range?: Range;
  } {
    if (!_.get(this.config, ['vetur', 'experimental', 'templateInterpolationService'], true)) {
      return { contents: [] };
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(templateDoc);
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
      const doc = this.tsModule.displayPartsToString(info.documentation);
      const markedContents: MarkedString[] = [{ language: 'ts', value: display }];
      if (doc) {
        markedContents.unshift(doc, '\n');
      }
      return {
        range: mapBackRange(templateDoc, info.textSpan, templateSourceMap),
        contents: markedContents
      };
    }
    return { contents: [] };
  }

  findDefinition(document: TextDocument, position: Position): Location[] {
    if (!_.get(this.config, ['vetur', 'experimental', 'templateInterpolationService'], true)) {
      return [];
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(templateDoc);
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
          uri: definitionTargetDoc.uri.toString(),
          range
        });
      }
    });
    return definitionResults;
  }

  findReferences(document: TextDocument, position: Position): Location[] {
    if (!_.get(this.config, ['vetur', 'experimental', 'templateInterpolationService'], true)) {
      return [];
    }

    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentVirtualVueTextDocument(templateDoc);
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
          uri: referenceTargetDoc.uri.toString(),
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
