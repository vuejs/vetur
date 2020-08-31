import { VueFileInfo, PropInfo } from '../../../services/vueInfoService';
import { TextDocument, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver-types';
import { HTMLDocument, Node } from '../parser/htmlParser';
import { kebabCase } from 'lodash';
import { getSameTagInSet } from '../tagProviders/common';

export function doPropValidation(document: TextDocument, htmlDocument: HTMLDocument, info: VueFileInfo): Diagnostic[] {
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
        const d = generateDiagnostic(n, foundTag, document);
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

function generateDiagnostic(n: Node, definedProps: PropInfo[], document: TextDocument): Diagnostic | undefined {
  const seenProps = n.attributeNames.map(attr => {
    return {
      name: attr,
      normalized: normalizeHtmlAttributeNameToKebabCase(attr)
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
    severity: missingProps.some(p => p.detailed) ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    message: `<${n.tag}> misses props: ${missingProps.map(p => p.normalized).join(', ')}\n`,
    range: {
      start: document.positionAt(n.start),
      end: document.positionAt(n.end)
    }
  };
}

function normalizeHtmlAttributeNameToKebabCase(attr: string) {
  let result = attr;

  if (result.startsWith('v-bind:')) {
    result = attr.slice('v-bind:'.length);
  } else if (result.startsWith(':')) {
    result = attr.slice(':'.length);
  }

  result = kebabCase(result);

  return result;
}
