import { TextDocument, Position, Hover, Range } from 'vscode-languageserver-types';

import { buildAst, findNodeAtPosition } from './parser';

import { cssData } from './css-browser-data';
import * as _ from 'lodash';

export function stylusHover(document: TextDocument, position: Position): Hover {
  const ast = buildAst(document.getText());
  if (!ast) {
    return {
      contents: ''
    };
  }
  const node = findNodeAtPosition(ast, position);
  if (!node) {
    return {
      contents: 'no node found!'
    };
  }

  if (node.__type === 'Property') {
    const property = node.segments[0].name;
    const properties = cssData.properties;
    const item = _.find(properties, item => item.name === property);
    const lineno = node.lineno - 1;
    const column = node.column;
    return {
      contents: (item && item.description) || 'unknown property',
      range: Range.create(lineno, column, lineno, column + properties.length)
    };
  }
  return {
    contents: []
  };
}
