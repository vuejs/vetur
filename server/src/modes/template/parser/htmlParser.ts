import { TokenType, createScanner } from './htmlScanner';
import { isEmptyElement } from '../tagProviders/htmlTags';
import { TextDocument } from 'vscode-languageserver-types';

export class Node {
  public tag?: string;
  public closed?: boolean;
  public endTagStart?: number;
  public isInterpolation: boolean;
  public attributes?: { [name: string]: string };
  public get attributeNames(): string[] {
    if(this.attributes) {
      return Object.keys(this.attributes);
    }

    return [];
  }
  constructor(public start: number, public end: number, public children: Node[], public parent: Node) {
    this.isInterpolation = false;
  }
  public isSameTag(tagInLowerCase: string) {
    return (
      this.tag &&
      tagInLowerCase &&
      this.tag.length === tagInLowerCase.length &&
      this.tag.toLowerCase() === tagInLowerCase
    );
  }
  public get firstChild(): Node {
    return this.children[0];
  }
  public get lastChild(): Node | undefined {
    return this.children.length ? this.children[this.children.length - 1] : void 0;
  }

  public findNodeBefore(offset: number): Node {
    const idx = findFirst(this.children, c => offset <= c.start) - 1;
    if (idx >= 0) {
      const child = this.children[idx];
      if (offset > child.start) {
        if (offset < child.end) {
          return child.findNodeBefore(offset);
        }
        const lastChild = child.lastChild;
        if (lastChild && lastChild.end === child.end) {
          return child.findNodeBefore(offset);
        }
        return child;
      }
    }
    return this;
  }

  public findNodeAt(offset: number): Node {
    const idx = findFirst(this.children, c => offset <= c.start) - 1;
    if (idx >= 0) {
      const child = this.children[idx];
      if (offset > child.start && offset <= child.end) {
        return child.findNodeAt(offset);
      }
    }
    return this;
  }
}

export interface HTMLDocument {
  roots: Node[];
  findNodeBefore(offset: number): Node;
  findNodeAt(offset: number): Node;
}

export function parse(text: string): HTMLDocument {
  const scanner = createScanner(text);

  const htmlDocument = new Node(0, text.length, [], null as any);
  let curr = htmlDocument;
  let endTagStart = -1;
  let pendingAttribute = '';
  let token = scanner.scan();
  let attributes: { [k: string]: string } | undefined = {};
  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.StartTagOpen:
        const child = new Node(scanner.getTokenOffset(), text.length, [], curr);
        curr.children.push(child);
        curr = child;
        break;
      case TokenType.StartTag:
        curr.tag = scanner.getTokenText();
        break;
      case TokenType.StartTagClose:
        curr.end = scanner.getTokenEnd(); // might be later set to end tag position
        if (isEmptyElement(curr.tag) && curr !== htmlDocument) {
          curr.closed = true;
          curr = curr.parent;
        }
        break;
      case TokenType.EndTagOpen:
        endTagStart = scanner.getTokenOffset();
        break;
      case TokenType.EndTag:
        const closeTag = scanner.getTokenText().toLowerCase();
        while (!curr.isSameTag(closeTag) && curr !== htmlDocument) {
          curr.end = endTagStart;
          curr.closed = false;
          curr = curr.parent;
        }
        if (curr !== htmlDocument) {
          curr.closed = true;
          curr.endTagStart = endTagStart;
        }
        break;
      case TokenType.StartTagSelfClose:
        if (curr !== htmlDocument) {
          curr.closed = true;
          curr.end = scanner.getTokenEnd();
          curr = curr.parent;
        }
        break;
      case TokenType.EndTagClose:
        if (curr !== htmlDocument) {
          curr.end = scanner.getTokenEnd();
          curr = curr.parent;
        }
        break;
      case TokenType.StartInterpolation: {
        const child = new Node(scanner.getTokenOffset(), text.length, [], curr);
        child.isInterpolation = true;
        curr.children.push(child);
        curr = child;
        break;
      }
      case TokenType.EndInterpolation:
        curr.end = scanner.getTokenEnd();
        curr.closed = true;
        curr = curr.parent;
        break;
      case TokenType.AttributeName:
        pendingAttribute = scanner.getTokenText();
        attributes = curr.attributes;
        if (!attributes) {
          curr.attributes = attributes = {};
        }
        attributes[pendingAttribute] = ''; // Support valueless attributes such as 'checked'
        break;
      case TokenType.AttributeValue:
        const value = scanner.getTokenText();
        if (attributes && pendingAttribute) {
          attributes[pendingAttribute] = value;
          pendingAttribute = '';
        }
        break;
    }
    token = scanner.scan();
  }
  while (curr !== htmlDocument) {
    curr.end = text.length;
    curr.closed = false;
    curr = curr.parent;
  }
  return {
    roots: htmlDocument.children,
    findNodeBefore: htmlDocument.findNodeBefore.bind(htmlDocument),
    findNodeAt: htmlDocument.findNodeAt.bind(htmlDocument)
  };
}

export function parseHTMLDocument(document: TextDocument): HTMLDocument {
  return parse(document.getText());
}

/**
 * Takes a sorted array and a function p. The array is sorted in such a way that all elements where p(x) is false
 * are located before all elements where p(x) is true.
 * @returns the least x for which p(x) is true or array.length if no element fullfills the given function.
 */
function findFirst<T>(array: T[], p: (x: T) => boolean): number {
  let low = 0,
    high = array.length;
  if (high === 0) {
    return 0; // no children
  }
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (p(array[mid])) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  return low;
}
