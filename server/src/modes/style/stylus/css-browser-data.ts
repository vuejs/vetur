/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  CSSDataV1,
  IPropertyData,
  IAtDirectiveData,
  IPseudoClassData,
  IPseudoElementData
} from 'vscode-css-languageservice';

export interface LoadedCSSData {
  properties: IPropertyData[];
  atDirectives: IAtDirectiveData[];
  pseudoClasses: IPseudoClassData[];
  pseudoElements: IPseudoElementData[];
}

const rawData: CSSDataV1 = require('vscode-css-languageservice/lib/umd/data/browsers').cssData;

export const cssData: LoadedCSSData = {
  properties: rawData.properties || [],
  atDirectives: rawData.atDirectives || [],
  pseudoClasses: rawData.pseudoClasses || [],
  pseudoElements: rawData.pseudoElements || []
};
