import { Location, Range, SymbolInformation, SymbolKind } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { HTMLDocument, Node } from '../parser/htmlParser';

export function findDocumentSymbols(document: TextDocument, htmlDocument: HTMLDocument): SymbolInformation[] {
  const symbols = <SymbolInformation[]>[];

  htmlDocument.roots.forEach(node => {
    provideFileSymbolsInternal(document, node, '', symbols);
  });

  return symbols;
}

function provideFileSymbolsInternal(
  document: TextDocument,
  node: Node,
  container: string,
  symbols: SymbolInformation[]
): void {
  if (node.isInterpolation) {
    return;
  }
  const name = nodeToName(node);
  if (name !== '') {
    const location = Location.create(
      document.uri,
      Range.create(document.positionAt(node.start), document.positionAt(node.end))
    );
    const symbol: SymbolInformation = {
      name,
      location,
      containerName: container,
      kind: <SymbolKind>SymbolKind.Field
    };

    symbols.push(symbol);
  }

  node.children.forEach(child => {
    provideFileSymbolsInternal(document, child, name, symbols);
  });
}

function nodeToName(node: Node): string {
  let name = node.tag;

  if (!name) {
    return '';
  }

  if (node.attributes) {
    const id = node.attributes['id'];
    const classes = node.attributes['class'];
    const slotRelatedAttrs = getVueSlotAttributes(node);

    if (id) {
      name += `#${id.replace(/[\"\']/g, '')}`;
    }

    if (classes) {
      name += classes
        .replace(/[\"\']/g, '')
        .split(/\s+/)
        .map(className => `.${className}`)
        .join('');
    }

    if (slotRelatedAttrs.length > 0) {
      name += `[${slotRelatedAttrs.join(' ')}]`;
    }
  }

  return name;
}

function getVueSlotAttributes(node: Node) {
  const vueSlotAttributes = node.attributeNames.filter(attr => attr.startsWith('#') || attr.startsWith('v-slot:'));

  const slotName = node.attributes?.name;
  if (node.tag === 'slot' && slotName) {
    vueSlotAttributes.push(`name=${slotName}`);
  }
  return vueSlotAttributes;
}
