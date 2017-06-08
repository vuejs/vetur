import {
  CompletionItem, CompletionItemKind,
  TextDocument, Position,
} from 'vscode-languageserver-types';

import {
  StylusNode,
  buildAst, flattenAndFilterAst,
  isFunctionNode, isSelectorCallNode, isSelectorNode, isVariableNode
} from './parser';

import * as  cssSchema from './css-schema';
import builtIn from './built-in';
import * as _ from 'lodash'

type CSSSchema = typeof cssSchema


function prepareName(name:string) : string {
  return name.replace(/\{|\}/g, '').trim();
}

/**
 * Naive check whether currentWord is class or id
 * @param {String} currentWord
 * @return {Boolean}
 */
export function isClassOrId(currentWord:string) : boolean {
  return /^[.#&]/.test(currentWord)
}

/**
 * Naive check whether currentWord is at rule
 * @param {String} currentWord
 * @return {Boolean}
 */
export function isAtRule(currentWord:string) : boolean {
  return _.startsWith(currentWord, '\@');
}

/**
 * Naive check whether currentWord is value for given property
 * @param {Object} cssSchema
 * @param {String} currentWord
 * @return {Boolean}
 */
export function isValue(cssSchema: CSSSchema, currentWord:string) : boolean {
  const property = getPropertyName(currentWord);

  return !!property && Boolean(findPropertySchema(cssSchema, property));
}

/**
 * Formats property name
 * @param {String} currentWord
 * @return {String}
 */
export function getPropertyName(currentWord:string) : string {
  return currentWord.trim().replace(':', ' ').split(' ')[0];
}

/**
 * Search for property in cssSchema
 * @param {Object} cssSchema
 * @param {String} property
 * @return {Object}
 */
export function findPropertySchema(cssSchema: CSSSchema, property:string) {
  const properties = cssSchema.data.css.properties
  return _.find(properties, item => item.name === property)
}

/**
 * Handler for variables
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {SymbolInformation}
 */
function _variableSymbol(node:StylusNode, text:string[], currentWord:string) : CompletionItem {
  const name = node.name;
  const lineno = Number(node.val.lineno) - 1;

  const completionItem = CompletionItem.create(name);
  completionItem.detail = text[lineno].trim();
  completionItem.kind = CompletionItemKind.Variable;

  return completionItem;
}

/**
 * Handler for function
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {CompletionItem}
 */
function _functionSymbol(node:StylusNode, text:string[]) : CompletionItem {
  const name = node.name;

  const completionItem = CompletionItem.create(name);
  completionItem.kind = CompletionItemKind.Function;

  return completionItem;
}

/**
 * Handler for selectors
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @param {String} currentWord
 * @return {CompletionItem}
 */
function _selectorSymbol(node:StylusNode, text:string[], currentWord:string) : CompletionItem {
  const firstSegment = node.segments[0];
  const name = firstSegment.string ?
    node.segments.map(s => s.string).join('') :
    firstSegment.nodes.map(s => s.name).join('');

  const completionItem = CompletionItem.create(name);
  completionItem.kind = CompletionItemKind.Class;

  return completionItem;
}

/**
 * Handler for selector call symbols
 * @param {Object} node
 * @param {String[]} text - text editor content splitted by lines
 * @return {CompletionItem}
 */
function _selectorCallSymbol(node:StylusNode, text:string[]) : CompletionItem {
  const lineno = Number(node.lineno) - 1;
  const name = prepareName(text[lineno]);

  const completionItem = CompletionItem.create(name);
  completionItem.kind = CompletionItemKind.Class;

  return completionItem;
}

/**
 * Returns completion items lists from document symbols
 * @param {String} text
 * @param {String} currentWord
 * @return {CompletionItem}
 */
export function getAllSymbols(text:string, currentWord:string) : CompletionItem[] {
  const ast = buildAst(text);
  const splittedText = text.split('\n');
  const rawSymbols = flattenAndFilterAst(ast).filter(item =>
    item && ['media', 'keyframes', 'atrule', 'import', 'require', 'supports', 'literal'].indexOf(item.nodeName) === -1);

  return _.compact(rawSymbols.map(item => {
    if (isVariableNode(item)) {
      return _variableSymbol(item, splittedText, currentWord);
    }

    if (isFunctionNode(item)) {
      return _functionSymbol(item, splittedText);
    }

    if (isSelectorNode(item)) {
      return _selectorSymbol(item, splittedText, currentWord);
    }

    if (isSelectorCallNode(item)) {
      return _selectorCallSymbol(item, splittedText);
    }
  }));
}

/**
 * Returns at rules list for completion
 * @param {Object} cssSchema
 * @param {String} currentWord
 * @return {CompletionItem}
 */
export function getAtRules(cssSchema: CSSSchema, currentWord:string) : CompletionItem[] {
  if (!isAtRule(currentWord)) return [];

  return cssSchema.data.css.atdirectives.map(property => {
    const completionItem = CompletionItem.create(property.name);

    completionItem.detail = property.desc;
    completionItem.kind = CompletionItemKind.Keyword;

    return completionItem;
  });
}

/**
 * Returns property list for completion
 * @param {Object} cssSchema
 * @param {String} currentWord
 * @return {CompletionItem}
 */
export function getProperties(cssSchema: CSSSchema, currentWord:string, useSeparator:boolean) : CompletionItem[] {
  if (isClassOrId(currentWord) || isAtRule(currentWord)) return [];

  return cssSchema.data.css.properties.map(property => {
    const completionItem = CompletionItem.create(property.name);

    completionItem.insertText = property.name + (useSeparator ? ': ' : ' ');
    completionItem.detail = property.desc;
    completionItem.kind = CompletionItemKind.Property;

    return completionItem;
  });
}

/**
 * Returns values for current property for completion list
 * @param {Object} cssSchema
 * @param {String} currentWord
 * @return {CompletionItem}
 */
export function getValues(cssSchema: CSSSchema, currentWord:string) : CompletionItem[] {
  const property = getPropertyName(currentWord);
  const result = findPropertySchema(cssSchema, property)
  const values = result && result.values;

  if (!values) return [];

  return values.map(property => {
    const completionItem = CompletionItem.create(property.name);

    completionItem.documentation = property.desc;
    completionItem.kind = CompletionItemKind.Value;

    return completionItem;
  });
}

export function provideCompletionItems(document: TextDocument, position: Position) : CompletionItem[] {
  const start = document.offsetAt(Position.create(position.line, 0))
  const end = document.offsetAt(position)
  const text = document.getText();
  const currentWord = text.slice(start, end).trim();
  const value = isValue(cssSchema, currentWord);
  // const config = workspace.getConfiguration('languageStylus');

  let completions: CompletionItem[] = []

  if (value) {
    let values = getValues(cssSchema, currentWord)
    let symbols = getAllSymbols(text, currentWord).filter(item => item.kind === CompletionItemKind.Variable)
    completions = completions.concat(values, symbols, builtIn)
  } else {
    let atRules = getAtRules(cssSchema, currentWord);
    let properties = getProperties(cssSchema, currentWord, true);
    let symbols = getAllSymbols(text, currentWord);
    completions = completions.concat(properties, atRules, symbols)
  }
  return completions;
}
