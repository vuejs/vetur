import { TextDocument, Location, Range, SymbolInformation, SymbolKind } from 'vscode-languageserver-types';
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

  node.children.forEach(child => {
    provideFileSymbolsInternal(document, child, name, symbols);
  });
}

function nodeToName(node: Node): string {
  let name = node.tag;

  if(!name) {
    return '';
  }

  if (node.attributes) {
    const id = node.attributes['id'];
    const classes = node.attributes['class'];

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
  }

  return name;
}
