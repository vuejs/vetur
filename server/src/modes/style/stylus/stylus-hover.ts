import {
  TextDocument, Position, Hover
} from 'vscode-languageserver-types';

import {
  buildAst, findNodeAtPosition
} from './parser'

import * as cssSchema from './css-schema'
import * as _ from 'lodash'

export function stylusHover(document: TextDocument, position: Position): Hover {
  let ast = buildAst(document.getText()) as any
  let node = findNodeAtPosition(ast, position)
  if (!node) {
    return {
      contents: 'no node found!'
    }
  }
  if (node.nodeName === 'property') {
    let property = node.segments[0].string
    const properties = cssSchema.data.css.properties
    const item = _.find(properties, item => item.name === property)
    return {
      contents: item && item.desc || 'unknown property'
    }
  }
  return {
    contents: ['']
  }
}
