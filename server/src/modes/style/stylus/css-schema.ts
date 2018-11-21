/* tslint:disable:max-line-length */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

interface CSSRecord {
  name: string;
  desc?: string;
  browsers?: string;
  restriction?: string;
  values?: CSSRecord[];
}

interface CSSData {
  css: {
    atdirectives: CSSRecord[];
    pseudoclasses: CSSRecord[];
    pseudoelements: CSSRecord[];
    properties: CSSRecord[];
  };
}

export const data: CSSData = require('vscode-css-languageservice/lib/umd/data/browsers').data;