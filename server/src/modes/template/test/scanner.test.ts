/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import assert from 'assert';
import { HtmlTokenType, ScannerState, createScanner } from '../parser/htmlScanner';

suite('HTML Scanner', () => {
  interface Token {
    offset: number;
    type: HtmlTokenType;
    content?: string;
  }

  function assertTokens(tests: { input: string; tokens: Token[] }[]) {
    let scannerState = ScannerState.WithinContent;
    for (const t of tests) {
      const scanner = createScanner(t.input, 0, scannerState);
      let tokenType = scanner.scan();
      const actual: Token[] = [];
      while (tokenType !== HtmlTokenType.EOS) {
        const actualToken: Token = { offset: scanner.getTokenOffset(), type: tokenType };
        if (tokenType === HtmlTokenType.StartTag || tokenType === HtmlTokenType.EndTag) {
          actualToken.content = t.input.slice(
            scanner.getTokenOffset(),
            scanner.getTokenOffset() + scanner.getTokenLength()
          );
        }
        actual.push(actualToken);
        tokenType = scanner.scan();
      }
      assert.deepEqual(actual, t.tokens);
      scannerState = scanner.getScannerState();
    }
  }

  test('Open Start Tag #1', () => {
    assertTokens([
      {
        input: '<abc',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' }
        ]
      }
    ]);
  });

  test('Open Start Tag #2', () => {
    assertTokens([
      {
        input: '<input',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'input' }
        ]
      }
    ]);
  });

  test('Open Start Tag with Invalid Tag', () => {
    assertTokens([
      {
        input: '< abc',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.Whitespace },
          { offset: 2, type: HtmlTokenType.StartTag, content: 'abc' }
        ]
      }
    ]);
  });

  test('Open Start Tag #3', () => {
    assertTokens([
      {
        input: '< abc>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.Whitespace },
          { offset: 2, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 5, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Open Start Tag #4', () => {
    assertTokens([
      {
        input: 'i <len;',
        tokens: [
          { offset: 0, type: HtmlTokenType.Content },
          { offset: 2, type: HtmlTokenType.StartTagOpen },
          { offset: 3, type: HtmlTokenType.StartTag, content: 'len' },
          { offset: 6, type: HtmlTokenType.Unknown }
        ]
      }
    ]);
  });

  test('Open Start Tag #5', () => {
    assertTokens([
      {
        input: '<',
        tokens: [{ offset: 0, type: HtmlTokenType.StartTagOpen }]
      }
    ]);
  });

  test('Open End Tag', () => {
    assertTokens([
      {
        input: '</a',
        tokens: [
          { offset: 0, type: HtmlTokenType.EndTagOpen },
          { offset: 2, type: HtmlTokenType.EndTag, content: 'a' }
        ]
      }
    ]);
  });

  test('Complete Start Tag', () => {
    assertTokens([
      {
        input: '<abc>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Complete Start Tag with Whitespace', () => {
    assertTokens([
      {
        input: '<abc >',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('bug 9809 - Complete Start Tag with Namespaceprefix', () => {
    assertTokens([
      {
        input: '<foo:bar>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'foo:bar' },
          { offset: 8, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Complete End Tag', () => {
    assertTokens([
      {
        input: '</abc>',
        tokens: [
          { offset: 0, type: HtmlTokenType.EndTagOpen },
          { offset: 2, type: HtmlTokenType.EndTag, content: 'abc' },
          { offset: 5, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Complete End Tag with Whitespace', () => {
    assertTokens([
      {
        input: '</abc  >',
        tokens: [
          { offset: 0, type: HtmlTokenType.EndTagOpen },
          { offset: 2, type: HtmlTokenType.EndTag, content: 'abc' },
          { offset: 5, type: HtmlTokenType.Whitespace },
          { offset: 7, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Empty Tag', () => {
    assertTokens([
      {
        input: '<abc />',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.StartTagSelfClose }
        ]
      }
    ]);
  });

  test('Embedded Content #1', () => {
    assertTokens([
      {
        input: '<script type="text/javascript">var i= 10;</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 30, type: HtmlTokenType.StartTagClose },
          { offset: 31, type: HtmlTokenType.Script },
          { offset: 41, type: HtmlTokenType.EndTagOpen },
          { offset: 43, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 49, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #2', () => {
    assertTokens([
      {
        input: '<script type="text/javascript">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 30, type: HtmlTokenType.StartTagClose }
        ]
      },
      {
        input: 'var i= 10;',
        tokens: [{ offset: 0, type: HtmlTokenType.Script }]
      },
      {
        input: '</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.EndTagOpen },
          { offset: 2, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 8, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #3', () => {
    assertTokens([
      {
        input: '<script type="text/javascript">var i= 10;',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 30, type: HtmlTokenType.StartTagClose },
          { offset: 31, type: HtmlTokenType.Script }
        ]
      },
      {
        input: '</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.EndTagOpen },
          { offset: 2, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 8, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #4', () => {
    assertTokens([
      {
        input: '<script type="text/javascript">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 30, type: HtmlTokenType.StartTagClose }
        ]
      },
      {
        input: 'var i= 10;</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.Script },
          { offset: 10, type: HtmlTokenType.EndTagOpen },
          { offset: 12, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 18, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #5', () => {
    assertTokens([
      {
        input: '<script type="text/plain">a\n<a</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 25, type: HtmlTokenType.StartTagClose },
          { offset: 26, type: HtmlTokenType.Script },
          { offset: 30, type: HtmlTokenType.EndTagOpen },
          { offset: 32, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 38, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #6', () => {
    assertTokens([
      {
        input: '<script>a</script><script>b</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script },
          { offset: 9, type: HtmlTokenType.EndTagOpen },
          { offset: 11, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 17, type: HtmlTokenType.EndTagClose },
          { offset: 18, type: HtmlTokenType.StartTagOpen },
          { offset: 19, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 25, type: HtmlTokenType.StartTagClose },
          { offset: 26, type: HtmlTokenType.Script },
          { offset: 27, type: HtmlTokenType.EndTagOpen },
          { offset: 29, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 35, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #7', () => {
    assertTokens([
      {
        input: '<script type="text/javascript"></script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 30, type: HtmlTokenType.StartTagClose },
          { offset: 31, type: HtmlTokenType.EndTagOpen },
          { offset: 33, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 39, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #8', () => {
    assertTokens([
      {
        input: '<script>var i= 10;</script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script },
          { offset: 18, type: HtmlTokenType.EndTagOpen },
          { offset: 20, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 26, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #9', () => {
    assertTokens([
      {
        input: '<script type="text/javascript" src="main.js"></script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.Whitespace },
          { offset: 8, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.DelimiterAssign },
          { offset: 13, type: HtmlTokenType.AttributeValue },
          { offset: 30, type: HtmlTokenType.Whitespace },
          { offset: 31, type: HtmlTokenType.AttributeName },
          { offset: 34, type: HtmlTokenType.DelimiterAssign },
          { offset: 35, type: HtmlTokenType.AttributeValue },
          { offset: 44, type: HtmlTokenType.StartTagClose },
          { offset: 45, type: HtmlTokenType.EndTagOpen },
          { offset: 47, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 53, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #10', () => {
    assertTokens([
      {
        input: '<script><!-- alert("<script></script>"); --></script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script },
          { offset: 44, type: HtmlTokenType.EndTagOpen },
          { offset: 46, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 52, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #11', () => {
    assertTokens([
      {
        input: '<script><!-- alert("<script></script>"); </script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script },
          { offset: 41, type: HtmlTokenType.EndTagOpen },
          { offset: 43, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 49, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #12', () => {
    assertTokens([
      {
        input: '<script><!-- alert("</script>"); </script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script },
          { offset: 20, type: HtmlTokenType.EndTagOpen },
          { offset: 22, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 28, type: HtmlTokenType.EndTagClose },
          { offset: 29, type: HtmlTokenType.Content },
          { offset: 33, type: HtmlTokenType.EndTagOpen },
          { offset: 35, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 41, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Embedded Content #13', () => {
    assertTokens([
      {
        input: '<script> alert("<script></script>"); </script>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script },
          { offset: 24, type: HtmlTokenType.EndTagOpen },
          { offset: 26, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 32, type: HtmlTokenType.EndTagClose },
          { offset: 33, type: HtmlTokenType.Content },
          { offset: 37, type: HtmlTokenType.EndTagOpen },
          { offset: 39, type: HtmlTokenType.EndTag, content: 'script' },
          { offset: 45, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
  });

  test('Tag with Attribute', () => {
    assertTokens([
      {
        input: '<abc foo="bar">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue },
          { offset: 14, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Vue Bind Shorthand', () => {
    assertTokens([
      {
        input: '<abc :foo="bar">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 9, type: HtmlTokenType.DelimiterAssign },
          { offset: 10, type: HtmlTokenType.AttributeValue },
          { offset: 15, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Empty Attribute Value', () => {
    assertTokens([
      {
        input: "<abc foo='bar'>",
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue },
          { offset: 14, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with empty attributes', () => {
    assertTokens([
      {
        input: '<abc foo="">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue },
          { offset: 11, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Attributes', () => {
    assertTokens([
      {
        input: '<abc foo="bar" bar=\'foo\'>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue },
          { offset: 14, type: HtmlTokenType.Whitespace },
          { offset: 15, type: HtmlTokenType.AttributeName },
          { offset: 18, type: HtmlTokenType.DelimiterAssign },
          { offset: 19, type: HtmlTokenType.AttributeValue },
          { offset: 24, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Attributes, no quotes', () => {
    assertTokens([
      {
        input: '<abc foo=bar bar=help-me>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue },
          { offset: 12, type: HtmlTokenType.Whitespace },
          { offset: 13, type: HtmlTokenType.AttributeName },
          { offset: 16, type: HtmlTokenType.DelimiterAssign },
          { offset: 17, type: HtmlTokenType.AttributeValue },
          { offset: 24, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Attributes, no quotes, self close', () => {
    assertTokens([
      {
        input: '<abc foo=bar/>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue },
          { offset: 12, type: HtmlTokenType.StartTagSelfClose }
        ]
      }
    ]);
  });

  test('Tag with Attribute And Whitespace', () => {
    assertTokens([
      {
        input: '<abc foo=  "bar">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.Whitespace },
          { offset: 11, type: HtmlTokenType.AttributeValue },
          { offset: 16, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Attribute And Whitespace #2', () => {
    assertTokens([
      {
        input: '<abc foo = "bar">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.Whitespace },
          { offset: 9, type: HtmlTokenType.DelimiterAssign },
          { offset: 10, type: HtmlTokenType.Whitespace },
          { offset: 11, type: HtmlTokenType.AttributeValue },
          { offset: 16, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Name-Only-Attribute #1', () => {
    assertTokens([
      {
        input: '<abc foo>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Name-Only-Attribute #2', () => {
    assertTokens([
      {
        input: '<abc foo bar>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.Whitespace },
          { offset: 9, type: HtmlTokenType.AttributeName },
          { offset: 12, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Interesting Attribute Name', () => {
    assertTokens([
      {
        input: '<abc foo!@#="bar">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 11, type: HtmlTokenType.DelimiterAssign },
          { offset: 12, type: HtmlTokenType.AttributeValue },
          { offset: 17, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Angular Attribute Name', () => {
    assertTokens([
      {
        input: '<abc #myinput (click)="bar" [value]="someProperty" *ngIf="someCondition">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 13, type: HtmlTokenType.Whitespace },
          { offset: 14, type: HtmlTokenType.AttributeName },
          { offset: 21, type: HtmlTokenType.DelimiterAssign },
          { offset: 22, type: HtmlTokenType.AttributeValue },
          { offset: 27, type: HtmlTokenType.Whitespace },
          { offset: 28, type: HtmlTokenType.AttributeName },
          { offset: 35, type: HtmlTokenType.DelimiterAssign },
          { offset: 36, type: HtmlTokenType.AttributeValue },
          { offset: 50, type: HtmlTokenType.Whitespace },
          { offset: 51, type: HtmlTokenType.AttributeName },
          { offset: 56, type: HtmlTokenType.DelimiterAssign },
          { offset: 57, type: HtmlTokenType.AttributeValue },
          { offset: 72, type: HtmlTokenType.StartTagClose }
        ]
      }
    ]);
  });

  test('Tag with Invalid Attribute Value', () => {
    assertTokens([
      {
        input: '<abc foo=">',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'abc' },
          { offset: 4, type: HtmlTokenType.Whitespace },
          { offset: 5, type: HtmlTokenType.AttributeName },
          { offset: 8, type: HtmlTokenType.DelimiterAssign },
          { offset: 9, type: HtmlTokenType.AttributeValue }
        ]
      }
    ]);
  });

  test('Simple Comment 1', () => {
    assertTokens([
      {
        input: '<!--a-->',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartCommentTag },
          { offset: 4, type: HtmlTokenType.Comment },
          { offset: 5, type: HtmlTokenType.EndCommentTag }
        ]
      }
    ]);
  });

  test('Simple Comment 2', () => {
    assertTokens([
      {
        input: '<!--a>foo bar</a -->',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartCommentTag },
          { offset: 4, type: HtmlTokenType.Comment },
          { offset: 17, type: HtmlTokenType.EndCommentTag }
        ]
      }
    ]);
  });

  test('Multiline Comment', () => {
    assertTokens([
      {
        input: '<!--a>\nfoo \nbar</a -->',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartCommentTag },
          { offset: 4, type: HtmlTokenType.Comment },
          { offset: 19, type: HtmlTokenType.EndCommentTag }
        ]
      }
    ]);
  });

  test('Simple Doctype', () => {
    assertTokens([
      {
        input: '<!Doctype a>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartDoctypeTag },
          { offset: 9, type: HtmlTokenType.Doctype },
          { offset: 11, type: HtmlTokenType.EndDoctypeTag }
        ]
      }
    ]);
  });

  test('Simple Doctype #2', () => {
    assertTokens([
      {
        input: '<!doctype a>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartDoctypeTag },
          { offset: 9, type: HtmlTokenType.Doctype },
          { offset: 11, type: HtmlTokenType.EndDoctypeTag }
        ]
      }
    ]);
  });

  test('Simple Doctype #4', () => {
    assertTokens([
      {
        input: '<!DOCTYPE a\n"foo" \'bar\'>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartDoctypeTag },
          { offset: 9, type: HtmlTokenType.Doctype },
          { offset: 23, type: HtmlTokenType.EndDoctypeTag }
        ]
      }
    ]);
  });

  test('Incomplete', () => {
    assertTokens([
      {
        input: '    ',
        tokens: [{ offset: 0, type: HtmlTokenType.Content }]
      }
    ]);
    assertTokens([
      {
        input: '<!---   ',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartCommentTag },
          { offset: 4, type: HtmlTokenType.Comment }
        ]
      }
    ]);
    assertTokens([
      {
        input: '<style>color:red',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'style' },
          { offset: 6, type: HtmlTokenType.StartTagClose },
          { offset: 7, type: HtmlTokenType.Styles }
        ]
      }
    ]);
    assertTokens([
      {
        input: '<script>alert("!!")',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'script' },
          { offset: 7, type: HtmlTokenType.StartTagClose },
          { offset: 8, type: HtmlTokenType.Script }
        ]
      }
    ]);
  });
  test('interpolation', () => {
    assertTokens([
      {
        input: '{{interpolation}}',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartInterpolation },
          { offset: 2, type: HtmlTokenType.InterpolationContent },
          { offset: 15, type: HtmlTokenType.EndInterpolation }
        ]
      },
      {
        input: 'div{{interpolation}}',
        tokens: [
          { offset: 0, type: HtmlTokenType.Content },
          { offset: 3, type: HtmlTokenType.StartInterpolation },
          { offset: 5, type: HtmlTokenType.InterpolationContent },
          { offset: 18, type: HtmlTokenType.EndInterpolation }
        ]
      },
      {
        input: 'div{{interpolation}}div',
        tokens: [
          { offset: 0, type: HtmlTokenType.Content },
          { offset: 3, type: HtmlTokenType.StartInterpolation },
          { offset: 5, type: HtmlTokenType.InterpolationContent },
          { offset: 18, type: HtmlTokenType.EndInterpolation },
          { offset: 20, type: HtmlTokenType.Content }
        ]
      }
    ]);
    assertTokens([
      {
        input: '<div>{{interpolation}}</div>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'div' },
          { offset: 4, type: HtmlTokenType.StartTagClose },
          { offset: 5, type: HtmlTokenType.StartInterpolation },
          { offset: 7, type: HtmlTokenType.InterpolationContent },
          { offset: 20, type: HtmlTokenType.EndInterpolation },
          { offset: 22, type: HtmlTokenType.EndTagOpen },
          { offset: 24, type: HtmlTokenType.EndTag, content: 'div' },
          { offset: 27, type: HtmlTokenType.EndTagClose }
        ]
      },
      {
        input: '<div>{{interpolation}}</div>',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartTagOpen },
          { offset: 1, type: HtmlTokenType.StartTag, content: 'div' },
          { offset: 4, type: HtmlTokenType.StartTagClose },
          { offset: 5, type: HtmlTokenType.StartInterpolation },
          { offset: 7, type: HtmlTokenType.InterpolationContent },
          { offset: 20, type: HtmlTokenType.EndInterpolation },
          { offset: 22, type: HtmlTokenType.EndTagOpen },
          { offset: 24, type: HtmlTokenType.EndTag, content: 'div' },
          { offset: 27, type: HtmlTokenType.EndTagClose }
        ]
      }
    ]);
    assertTokens([
      {
        input: '{{interpolation',
        tokens: [
          { offset: 0, type: HtmlTokenType.StartInterpolation },
          { offset: 2, type: HtmlTokenType.InterpolationContent }
        ]
      }
    ]);
  });
});
