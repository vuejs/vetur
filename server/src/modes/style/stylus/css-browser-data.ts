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
import CssData from 'vscode-web-custom-data/data/browsers.css-data.json';

export interface LoadedCSSData {
  properties: IPropertyData[];
  atDirectives: IAtDirectiveData[];
  pseudoClasses: IPseudoClassData[];
  pseudoElements: IPseudoElementData[];
}

const rawData = CssData as CSSDataV1;

export const cssData: LoadedCSSData = {
  properties: rawData.properties || [],
  atDirectives: rawData.atDirectives || [],
  pseudoClasses: rawData.pseudoClasses || [],
  pseudoElements: rawData.pseudoElements || []
};
