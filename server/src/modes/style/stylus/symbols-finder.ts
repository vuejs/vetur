import { TextDocument, SymbolInformation, SymbolKind, Range, Position } from 'vscode-languageserver-types';

import {
  StylusNode,
  buildAst,
  flattenAndFilterAst,
  isAtRuleNode,
  isFunctionNode,
  isSelectorCallNode,
  isSelectorNode,
  isVariableNode
} from './parser';

import * as _ from 'lodash';

/**
 * Generates hash for symbol for comparison with other symbols
 * @param {SymbolInformation} symbol
 * @return {String}
 */
function _buildHashFromSymbol(symbol: SymbolInformation): string {
  return `${symbol.kind}_${symbol.name}_${symbol.location.range.start.line}_${symbol.location.range.end.line}`;
}

/**
 * Removes useless characters from symbol name
 * @param {String} name
 * @return String
 */
function prepareName(name: string): string {
  return name.replace(/\{|\}/g, '').trim();
}

/**
 * Handler for variables
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation}
 */
function _variableSymbol(node: StylusNode, text: string[]): SymbolInformation {
  const name = node.name;
  const lineno = Number(node.val!.lineno) - 1;
  const column = Math.max(text[lineno].indexOf(name), 0);
  const range = Range.create(lineno, column, lineno, column + name.length);

  return SymbolInformation.create(name, SymbolKind.Variable, range);
}

/**
 * Handler for function
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation}
 */
function _functionSymbol(node: StylusNode, text: string[]): SymbolInformation {
  const name = node.name;
  const lineno = Number(node.val!.lineno) - 1;
  const column = Math.max(text[lineno].indexOf(name), 0);

  const posStart = Position.create(lineno, column);
  const posEnd = Position.create(lineno, column + name.length);
  const range = Range.create(posStart, posEnd);

  return SymbolInformation.create(name, SymbolKind.Function, range);
}

/**
 * Handler for selectors
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation}
 */
function _selectorSymbol(node: StylusNode, text: string[]): SymbolInformation {
  const firstSegment = node.segments[0];
  const name = firstSegment.string
    ? node.segments.map(s => s.string).join('')
    : firstSegment.nodes!.map(s => s.name).join('');
  const lineno = Number(firstSegment.lineno) - 1;
  const column = node.column - 1;

  const posStart = Position.create(lineno, column);
  const posEnd = Position.create(lineno, column + name.length);
  const range = Range.create(posStart, posEnd);

  return SymbolInformation.create(name, SymbolKind.Class, range);
}

/**
 * Handler for selector call symbols
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation}
 */
function _selectorCallSymbol(node: StylusNode, text: string[]): SymbolInformation {
  const lineno = Number(node.lineno) - 1;
  const name = prepareName(text[lineno]);
  const column = Math.max(text[lineno].indexOf(name), 0);

  const posStart = Position.create(lineno, column);
  const posEnd = Position.create(lineno, column + name.length);

  return SymbolInformation.create(name, SymbolKind.Class, Range.create(posStart, posEnd));
}

/**
 * Handler for at rules
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation}
 */
function _atRuleSymbol(node: StylusNode, text: string[]): SymbolInformation {
  const lineno = Number(node.lineno) - 1;
  const name = prepareName(text[lineno]);
  const column = Math.max(text[lineno].indexOf(name), 0);

  const posStart = Position.create(lineno, column);
  const posEnd = Position.create(lineno, column + name.length);

  return SymbolInformation.create(name, SymbolKind.Namespace, Range.create(posStart, posEnd));
}

/**
 * Iterates through raw symbols and choose appropriate handler for each one
 * @param {Array} rawSymbols
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation[]}
 */
function processRawSymbols(rawSymbols: StylusNode[], text: string[]): SymbolInformation[] {
  return _.compact(
    rawSymbols.map(symNode => {
      if (isVariableNode(symNode)) {
        return _variableSymbol(symNode, text);
      }

      if (isFunctionNode(symNode)) {
        return _functionSymbol(symNode, text);
      }

      if (isSelectorNode(symNode)) {
        return _selectorSymbol(symNode, text);
      }

      if (isSelectorCallNode(symNode)) {
        return _selectorCallSymbol(symNode, text);
      }

      if (isAtRuleNode(symNode)) {
        return _atRuleSymbol(symNode, text);
      }
    })
  );
}

export function provideDocumentSymbols(document: TextDocument): SymbolInformation[] {
  const text = document.getText();
  const ast = buildAst(text);
  if (!ast) {
    return [];
  }
  const rawSymbols = _.compact(flattenAndFilterAst(ast));
  const symbolInfos = processRawSymbols(rawSymbols, text.split('\n'));

  return _.uniqBy(symbolInfos, _buildHashFromSymbol);
}
