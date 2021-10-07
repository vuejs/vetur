import { VueFileInfo, PropInfo } from '../../../services/vueInfoService';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { HTMLDocument, Node } from '../parser/htmlParser';
import { kebabCase } from 'lodash';
import { getSameTagInSet } from '../tagProviders/common';
import { normalizeAttributeNameToKebabCase } from './htmlCompletion';
import { VueVersion } from '../../../utils/vueVersion';

export function doPropValidation(
  document: TextDocument,
  htmlDocument: HTMLDocument,
  info: VueFileInfo,
  vueVersion: VueVersion
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const childComponentToProps: { [n: string]: PropInfo[] } = {};
  info.componentInfo.childComponents?.forEach(c => {
    if (c.info && c.info.componentInfo.props) {
      childComponentToProps[c.name] = c.info?.componentInfo.props.filter(el => el.required);
    }
  });

  traverseNodes(htmlDocument.roots, n => {
    if (n.tag) {
      const foundTag = getSameTagInSet(childComponentToProps, n.tag);
      if (foundTag) {
        const d = generateDiagnostic(n, foundTag, document, vueVersion);
        if (d) {
          diagnostics.push(d);
        }
      }
    }
  });

  return diagnostics;
}

function traverseNodes(nodes: Node[], f: (n: Node) => any) {
  if (nodes.length === 0) {
    return;
  }

  for (const node of nodes) {
    f(node);
    traverseNodes(node.children, f);
  }
}

function generateDiagnostic(
  n: Node,
  definedProps: PropInfo[],
  document: TextDocument,
  vueVersion: VueVersion
): Diagnostic | undefined {
  // Ignore diagnostic when have `v-bind`, `v-bind:[key]`, `:[key]`, `v-bind.sync`
  if (
    n.attributeNames.some(
      prop => prop === 'v-bind' || prop.startsWith('v-bind:[') || prop.startsWith(':[') || prop.startsWith('v-bind.')
    )
  ) {
    return undefined;
  }

  const vModelPropName = vueVersion === VueVersion.V30 ? 'modelValue' : 'value';

  const seenProps = n.attributeNames.map(attr => {
    return {
      name: attr,
      normalized: normalizeHtmlAttributeNameToKebabCaseAndReplaceVModel(
        attr,
        definedProps.find(prop => prop.isBoundToModel)?.name ?? vModelPropName
      )
    };
  });

  const requiredProps = definedProps.map(prop => {
    return {
      ...prop,
      normalized: kebabCase(prop.name)
    };
  });

  const missingProps: Array<PropInfo & { normalized: string }> = [];

  requiredProps.forEach(requiredProp => {
    if (!seenProps.map(s => s.normalized).includes(requiredProp.normalized)) {
      missingProps.push(requiredProp);
    }
  });

  if (missingProps.length === 0) {
    return undefined;
  }

  return {
    severity: missingProps.some(p => p.hasObjectValidator) ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    message: `<${n.tag}> misses props: ${missingProps.map(p => p.normalized).join(', ')}\n`,
    range: {
      start: document.positionAt(n.start),
      end: document.positionAt(n.end)
    }
  };
}

function normalizeHtmlAttributeNameToKebabCaseAndReplaceVModel(attr: string, modelProp: string) {
  // v-model.trim
  if (!attr.startsWith('v-model:') && attr.startsWith('v-model')) {
    return kebabCase(modelProp);
  }
  return normalizeAttributeNameToKebabCase(attr);
}
