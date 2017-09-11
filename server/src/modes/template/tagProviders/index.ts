import { IHTMLTagProvider } from './common';
import { getHTML5TagProvider } from './htmlTags';
import { getVueTagProvider } from './vueTags';
import { getRouterTagProvider } from './routerTags';
import { getElementTagProvider } from './elementTags';
import { getOnsenTagProvider } from './onsenTags';
export { getComponentTags } from './componentTags';
export { IHTMLTagProvider } from './common';

import * as ts from 'typescript';
import * as fs from 'fs';

export let allTagProviders : IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider(),
  getRouterTagProvider(),
  getElementTagProvider(),
  getOnsenTagProvider()
];

export interface CompletionConfiguration {
  [provider: string]: boolean;
}

export function getTagProviderSettings(workspacePath: string | null | undefined) {
  const settings: CompletionConfiguration = {
    html5: true,
    vue: true,
    router: false,
    element: false,
    onsen: false
  };
  if (!workspacePath) {
    return settings;
  }
  try {
    const packagePath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    if (packageJson.dependencies['vue-router']) {
      settings['router'] = true;
    }
    if (packageJson.dependencies['element-ui']) {
      settings['element'] = true;
    }
    if (packageJson.dependencies['vue-onsenui']) {
      settings['onsen'] = true;
    }
  } catch (e) { }
  return settings;
}

export function getEnabledTagProviders(tagProviderSetting: CompletionConfiguration) {
  return allTagProviders.filter(
    p => tagProviderSetting[p.getId()] !== false
  );
}
