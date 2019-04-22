import { LanguageMode } from '../../embeddedSupport/languageModes';
import {
  Diagnostic,
  TextDocument,
  DiagnosticSeverity,
  Position,
  Hover,
  MarkedString,
  Range
} from 'vscode-languageserver-types';
import { IServiceHost } from '../../services/typescriptService/serviceHost';
import { languageServiceIncludesFile } from '../script/javascript';
import { getFileFsPath } from '../../utils/paths';
import { mapBackRange, mapToRange, mapToPosition } from '../../services/typescriptService/sourceMap';
import * as ts from 'typescript';
import { T_TypeScript } from '../../services/dependencyService';

export class VueInterpolationMode implements LanguageMode {
  constructor(private tsModule: T_TypeScript, private serviceHost: IServiceHost) {}

  getId() {
    return 'vue-html-interpolation';
  }

  doValidation(document: TextDocument): Diagnostic[] {
    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentTextDocument(templateDoc);
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return [];
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    // We don't need syntactic diagnostics because
    // compiled template is always valid JavaScript syntax.
    const rawTemplateDiagnostics = templateService.getSemanticDiagnostics(templateFileFsPath);

    return rawTemplateDiagnostics.map(diag => {
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
    // Add suffix to process this doc as vue template.
    const templateDoc = TextDocument.create(
      document.uri + '.template',
      document.languageId,
      document.version,
      document.getText()
    );

    const { templateService, templateSourceMap } = this.serviceHost.updateCurrentTextDocument(templateDoc);
    if (!languageServiceIncludesFile(templateService, templateDoc.uri)) {
      return {
        contents: []
      };
    }

    const templateFileFsPath = getFileFsPath(templateDoc.uri);
    const mappedPosition = mapToPosition(templateDoc, position, templateSourceMap);

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

  onDocumentRemoved() {}

  dispose() {}
}
