import { IHTMLTagProvider } from './common';
import { getHTML5TagProvider } from './htmlTags';
import { getVueTagProvider } from './vueTags';
import { getRouterTagProvider } from './routerTags';
import { getElementTagProvider } from './elementTags';

import * as ts from 'typescript';
import * as fs from 'fs';

export let allTagProviders : IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider(),
  getRouterTagProvider(),
  getElementTagProvider()
];

export function getDefaultSetting(workspacePath: string) {
  let setting: {[kind: string]: boolean} = {
    html5: true,
    vue: true,
    router: false,
    element: false
  };
  try {
    let packagePath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'package.json');
    let packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    if (packageJson.dependencies['vue-router']) {
      setting['router'] = true;
    }
    if (packageJson.dependencies['element-ui']) {
      setting['element'] = true;
    }
  } catch (e) { }
  return setting;
}
