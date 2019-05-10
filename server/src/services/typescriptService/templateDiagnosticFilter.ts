import * as ts from 'typescript';
import { T_TypeScript } from '../dependencyService';

type DiagnosticFilter = (diagnostic: ts.Diagnostic) => boolean;

export function createTemplateDiagnosticFilter(tsModule: T_TypeScript) {
  /**
   * Ignores errors when accessing `private` or `protected` members on component.
   *
   * ```vue
   * <template>
   *   <!-- `a` is private but should not provide an error -->
   *   <p>{{ a }}</p>
   * </template>
   *
   * <script lang="ts">
   * import Vue from 'vue'
   * import Component from 'vue-class-component'
   *
   * @Component
   * export default class MyComp extends Vue {
   *   private a = 'Hi'
   * }
   * </script>
   * ```
   */
  const ignorePrivateProtectedViolation: DiagnosticFilter = diag => {
    const protectedViolationCode = 2445;
    const privateViolationCode = 2341;

    if (diag.code !== protectedViolationCode && diag.code !== privateViolationCode) {
      return true;
    }

    const source = diag.file;
    if (!source) {
      return true;
    }

    // Only ignore accesses to a member of a component instance
    const target = findNodeFromDiagnostic(diag, source);
    if (target && tsModule.isPropertyAccessExpression(target.parent)) {
      if (target.parent.expression.kind === tsModule.SyntaxKind.ThisKeyword) {
        return false;
      }
    }

    return true;
  };

  return mergeFilter([ignorePrivateProtectedViolation]);
}

/**
 * Merge an array of filter to create a filter function.
 */
function mergeFilter(filters: DiagnosticFilter[]): DiagnosticFilter {
  return diag => {
    return filters.every(f => f(diag));
  };
}

/**
 * Walk AST tree and get a node which the diagnostic probably refers.
 */
function findNodeFromDiagnostic(diag: ts.Diagnostic, node: ts.Node): ts.Node | undefined {
  if (diag.start === undefined || diag.length === undefined) {
    return undefined;
  }

  if (diag.start < node.getStart() || node.getEnd() < diag.start + diag.length) {
    return undefined;
  }

  const childMatch = node.getChildren().reduce<ts.Node | undefined>((matched, child) => {
    return matched || findNodeFromDiagnostic(diag, child);
  }, undefined);

  return childMatch ? childMatch : node;
}
