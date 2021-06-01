/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* tslint:disable:max-line-length */
/**
 * Adapted from https://github.com/microsoft/vscode/blob/8ba70d8bdc3a10e3143cc4a131f333263bc48eef/extensions/typescript-language-features/src/utils/previewer.ts
 */

import type ts from 'typescript';

function replaceLinks(text: string): string {
  return (
    text
      // Http(s) links
      .replace(
        /\{@(link|linkplain|linkcode) (https?:\/\/[^ |}]+?)(?:[| ]([^{}\n]+?))?\}/gi,
        (_, tag: string, link: string, text?: string) => {
          switch (tag) {
            case 'linkcode':
              return `[\`${text ? text.trim() : link}\`](${link})`;

            default:
              return `[${text ? text.trim() : link}](${link})`;
          }
        }
      )
  );
}

function processInlineTags(text: string): string {
  return replaceLinks(text);
}

function getTagBodyText(tag: ts.JSDocTagInfo): string | undefined {
  if (!tag.text) {
    return undefined;
  }

  // Convert to markdown code block if it is not already one
  function makeCodeblock(text: string): string {
    if (text.match(/^\s*[~`]{3}/g)) {
      return text;
    }
    return '```\n' + text + '\n```';
  }

  switch (tag.name) {
    case 'example':
      // check for caption tags, fix for #79704
      const captionTagMatches = plain(tag.text).match(/<caption>(.*?)<\/caption>\s*(\r\n|\n)/);
      if (captionTagMatches && captionTagMatches.index === 0) {
        return captionTagMatches[1] + '\n\n' + makeCodeblock(plain(tag.text).substr(captionTagMatches[0].length));
      } else {
        return makeCodeblock(plain(tag.text));
      }
    case 'author':
      // fix obsucated email address, #80898
      const emailMatch = plain(tag.text).match(/(.+)\s<([-.\w]+@[-.\w]+)>/);

      if (emailMatch === null) {
        return plain(tag.text);
      } else {
        return `${emailMatch[1]} ${emailMatch[2]}`;
      }
    case 'default':
      return makeCodeblock(plain(tag.text));
  }

  return processInlineTags(plain(tag.text));
}

export function getTagDocumentation(tag: ts.JSDocTagInfo): string | undefined {
  switch (tag.name) {
    case 'augments':
    case 'extends':
    case 'param':
    case 'template':
      const body = plain(tag.text || '').split(/^(\S+)\s*-?\s*/);
      if (body?.length === 3) {
        const param = body[1];
        const doc = body[2];
        const label = `*@${tag.name}* \`${param}\``;
        if (!doc) {
          return label;
        }
        return label + (doc.match(/\r\n|\n/g) ? '  \n' + processInlineTags(doc) : ` — ${processInlineTags(doc)}`);
      }
  }

  // Generic tag
  const label = `*@${tag.name}*`;
  const text = getTagBodyText(tag);
  if (!text) {
    return label;
  }
  return label + (text.match(/\r\n|\n/g) ? '  \n' + text : ` — ${text}`);
}

export function plain(parts: ts.SymbolDisplayPart[] | string): string {
  return processInlineTags(typeof parts === 'string' ? parts : parts.map(part => part.text).join(''));
}
