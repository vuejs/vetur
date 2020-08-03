import * as ts from 'typescript';
import { CompletionItemKind, CompletionItem } from 'vscode-languageserver';
import { VueFileInfo } from '../../../services/vueInfoService';
import { findNodeByOffset } from '../../../services/typescriptService/util';
import { T_TypeScript } from '../../../services/dependencyService';

export function getVueInterpolationCompletionMap(
  tsModule: T_TypeScript,
  fileName: string,
  offset: number,
  templateService: ts.LanguageService,
  vueFileInfo: VueFileInfo
): Map<string, CompletionItem> | undefined {
  const result = new Map<string, CompletionItem>();

  if (!isComponentCompletion(tsModule, fileName, offset, templateService)) {
    return;
  }

  if (vueFileInfo.componentInfo.props) {
    vueFileInfo.componentInfo.props.forEach(p => {
      result.set(p.name, {
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` prop`
        },
        kind: CompletionItemKind.Property
      });
    });
  }

  if (vueFileInfo.componentInfo.data) {
    vueFileInfo.componentInfo.data.forEach(p => {
      result.set(p.name, {
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` data`
        },
        kind: CompletionItemKind.Property
      });
    });
  }

  if (vueFileInfo.componentInfo.computed) {
    vueFileInfo.componentInfo.computed.forEach(p => {
      result.set(p.name, {
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` computed`
        },
        kind: CompletionItemKind.Property
      });
    });
  }

  if (vueFileInfo.componentInfo.methods) {
    vueFileInfo.componentInfo.methods.forEach(p => {
      result.set(p.name, {
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` method`
        },
        kind: CompletionItemKind.Method
      });
    });
  }

  return result;
}

function isComponentCompletion(
  tsModule: T_TypeScript,
  fileName: string,
  offset: number,
  templateService: ts.LanguageService
): boolean {
  const program = templateService.getProgram();
  if (!program) {
    return false;
  }

  const source = program.getSourceFile(fileName);
  if (!source) {
    return false;
  }

  const completionTarget = findNodeByOffset(source, offset);
  if (!completionTarget) {
    return false;
  }

  return (
    // Completion for direct component properties.
    // e.g. {{ valu| }}
    (tsModule.isPropertyAccessExpression(completionTarget.parent) &&
      completionTarget.parent.expression.kind === tsModule.SyntaxKind.ThisKeyword) ||
    // Completion for implicit component properties (e.g. triggering completion without any text).
    // e.g. {{ | }}
    !tsModule.isPropertyAccessExpression(completionTarget.parent)
  );
}
