import { IHTMLTagProvider } from './common';
import { getHTML5TagProvider } from './htmlTags';
import { getVueTagProvider } from './vueTags';
import { getRouterTagProvider } from './routerTags';
import { getElementTagProvider } from './elementTags';
import { getOnsenTagProvider } from './onsenTags';
export { getComponentTags } from './componentTags';

import * as ts from 'typescript';
import * as fs from 'fs';

export let allTagProviders : IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider(),
  getRouterTagProvider(),
  getElementTagProvider(),
  getOnsenTagProvider()
];

export function getDefaultSetting(workspacePath: string) {
  const setting: {[kind: string]: boolean} = {
    html5: true,
    vue: true,
    router: false,
    element: false,
    onsen: false
  };
  try {
    const packagePath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    if (packageJson.dependencies['vue-router']) {
      setting['router'] = true;
    }
    if (packageJson.dependencies['element-ui']) {
      setting['element'] = true;
    }
    if (packageJson.dependencies['vue-onsenui']) {
      setting['onsen'] = true;
    }
  } catch (e) { }
  return setting;
}
