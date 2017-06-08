import cssColors from './css-colors-list';
import { Position } from 'vscode-languageserver-types'

type NodeName = 'ident' | 'selector' | 'call' | 'function' |
 'media' | 'keyframes' | 'atrule' | 'import' | 'require' | 'supports' | 'literal' |
 'group' | 'root' | 'block' | 'expression' | 'rgba' | 'property' | 'object';

type NodeSegment = {
  string: string,
  lineno: number,
  nodes: Array<{ name: string }>
}

export interface StylusNode {
  nodeName: NodeName,
  lineno: number,
  nodes?: StylusNode[]
}

export interface StylusNode {
  nodeName: NodeName,
  name: NodeName,
  segments: NodeSegment[],
  expr?: StylusNode,
  lineno: number,
  column: number,
  val: StylusNode,
  nodes?: StylusNode[],
  vals?: StylusNode[]
  block?: StylusNode
}

const stylus = require('stylus');

/**
 * Checks wether node is variable declaration
 * @param {StylusNode} node
 * @return {Boolean}
 */
export function isVariableNode(node:StylusNode) : boolean {
  return node.nodeName === 'ident' && node.val && node.val.nodeName === 'expression';
}

/**
 * Checks wether node is function declaration
 * @param {StylusNode} node
 * @return {Boolean}
 */
export function isFunctionNode(node:StylusNode) : boolean {
  return node.nodeName === 'ident' && node.val && node.val.nodeName === 'function';
}

/**
 * Checks wether node is selector node
 * @param {StylusNode} node
 * @return {Boolean}
 */
export function isSelectorNode(node:StylusNode) : boolean {
  return node.nodeName === 'selector';
}

/**
 * Checks wether node is selector call node e.g.:
 * {mySelectors}
 * @param {StylusNode} node
 * @return {Boolean}
 */
export function isSelectorCallNode(node:StylusNode) : boolean {
  return node.nodeName === 'call' && node.name === 'selector';
}

/**
 * Checks wether node is at rule
 * @param {StylusNode} node
 * @return {Boolean}
 */
export function isAtRuleNode(node:StylusNode) : boolean {
  return ['media', 'keyframes', 'atrule', 'import', 'require', 'supports', 'literal'].indexOf(node.nodeName) !== -1
}

/**
 * Checks wether node contains color
 * @param {StylusNode} node
 * @return {Boolean}
 */
export function isColor(node:StylusNode) : boolean {
  if (node.nodeName === 'ident' && cssColors.indexOf(node.name) >= 0) return true;
  if (node.nodeName === 'rgba') return true;
  if (node.nodeName === 'call' && ['rgb', 'rgba', 'hsl', 'hsla'].indexOf(node.name) >= 0) return true;
  return false;
}

/**
 * Parses text editor content and returns ast
 * @param {string} text - text editor content
 * @return {Object}
 */
export function buildAst(text:string) : StylusNode | any[] {
  try {
    return new stylus.Parser(text).parse();
  } catch (error) {
    return [];
  }
}

/**
 * fractally fucked-up function
 * Flattens ast and removes useless nodes
 * @param {Object|Array} node
 * @return {Array}
 */
export function flattenAndFilterAst(node: any) : StylusNode[] {
  if (Array.isArray(node)) {
    return node.reduce((acc, item) => {
      return acc.concat(flattenAndFilterAst(item));
    }, []);
  }

  if (!node.nodeName) return undefined as any;
  if (node.nodeName === 'keyframes') return node;

  let nested: any[] = [];

  if (node.nodes) {
    nested = nested.concat(flattenAndFilterAst(node.nodes));
  }

  if (node.block) {
    nested = nested.concat(flattenAndFilterAst(node.block));
  }

  if (node.nodeName === 'group' || node.nodeName === 'root' || node.nodeName === 'block') {
    return nested.length ? nested : node;
  }

  // Hack prevents duplicated nodes.
  node.nodes = null;
  node.block = null;

  return nested.length ? [node].concat(nested) : node;
}

export function findNodeAtPosition(root: StylusNode, pos: Position, needBlock = false): StylusNode | null {
  // DFS: first find leaf node
  let block = root.block
  let children: StylusNode[] = []
  if (block) {
    children = [block] //needBlock ? [block] : (block.nodes || [])
  }
  if (root.vals) {
    children = children.concat(root.vals)
  }
  if (root.expr) {
    children = children.concat(root.expr.nodes || [])
  }
  if (root.nodes) {
    children = children.concat(root.nodes)
  }
  if (root.val) {
    children.push(root.val)
  }
  for (let child of children) {
    let ret = findNodeAtPosition(child, pos)
    if (ret) {
      return ret
    }
  }
  if (root.nodeName === 'function' && root.lineno === pos.line + 1) {
    return root // function node column is inconsisten, ignore
  }
  if (root.lineno !== pos.line + 1 || root.column > pos.character + 1) {
    // not in oneline, or root has passed pos
    return null
  }
  return root

}
