/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocument, FoldingRange, FoldingRangeKind } from 'vscode-languageserver-types';

import { TokenType, createScanner } from '../parser/htmlScanner';
import { isVoidElement } from '../tagProviders/htmlTags';

export function getFoldingRanges(document: TextDocument): FoldingRange[] {
  const scanner = createScanner(document.getText());
  let token = scanner.scan();
  const ranges: FoldingRange[] = [];
  const stack: { startLine: number; tagName: string }[] = [];
  let lastTagName = null;
  let prevStart = -1;

  function addRange(range: FoldingRange) {
    ranges.push(range);
    prevStart = range.startLine;
  }

  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.StartTag: {
        const tagName = scanner.getTokenText();
        const startLine = document.positionAt(scanner.getTokenOffset()).line;
        stack.push({ startLine, tagName });
        lastTagName = tagName;
        break;
      }
      case TokenType.EndTag: {
        lastTagName = scanner.getTokenText();
        break;
      }
      case TokenType.StartTagClose:
        if (!lastTagName || !isVoidElement(lastTagName)) {
          break;
        }
      // fallthrough
      case TokenType.EndTagClose:
      case TokenType.StartTagSelfClose: {
        let i = stack.length - 1;
        while (i >= 0 && stack[i].tagName !== lastTagName) {
          i--;
        }
        if (i >= 0) {
          const stackElement = stack[i];
          stack.length = i;
          const line = document.positionAt(scanner.getTokenOffset()).line;
          const startLine = stackElement.startLine;
          const endLine = line - 1;
          if (endLine > startLine && prevStart !== startLine) {
            addRange({ startLine, endLine });
          }
        }
        break;
      }
      case TokenType.Comment: {
        let startLine = document.positionAt(scanner.getTokenOffset()).line;
        const text = scanner.getTokenText();
        const m = text.match(/^\s*#(region\b)|(endregion\b)/);
        if (m) {
          if (m[1]) {
            // start pattern match
            stack.push({ startLine, tagName: '' }); // empty tagName marks region
          } else {
            let i = stack.length - 1;
            while (i >= 0 && stack[i].tagName.length) {
              i--;
            }
            if (i >= 0) {
              const stackElement = stack[i];
              stack.length = i;
              const endLine = startLine;
              startLine = stackElement.startLine;
              if (endLine > startLine && prevStart !== startLine) {
                addRange({ startLine, endLine, kind: FoldingRangeKind.Region });
              }
            }
          }
        } else {
          const endLine = document.positionAt(scanner.getTokenOffset() + scanner.getTokenLength()).line;
          if (startLine < endLine) {
            addRange({ startLine, endLine, kind: FoldingRangeKind.Comment });
          }
        }
        break;
      }
    }
    token = scanner.scan();
  }

  return ranges;
}
