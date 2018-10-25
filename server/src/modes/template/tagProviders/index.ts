import { IHTMLTagProvider } from './common';
import { getHTML5TagProvider } from './htmlTags';
import { getVueTagProvider } from './vueTags';
import { getRouterTagProvider } from './routerTags';
import {
  elementTagProvider,
  onsenTagProvider,
  bootstrapTagProvider,
  buefyTagProvider,
  vuetifyTagProvider,
  getQuasarTagProvider,
  getExternalTagProvider
} from './externalTagProviders';
export { getComponentTags } from './componentTags';
export { IHTMLTagProvider } from './common';

import * as ts from 'typescript';
import * as fs from 'fs';
import { join } from 'path';

export let allTagProviders: IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider(),
  getRouterTagProvider(),
  elementTagProvider,
  onsenTagProvider,
  bootstrapTagProvider,
  buefyTagProvider,
  vuetifyTagProvider
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
    onsen: false,
    bootstrap: false,
    buefy: false,
    vuetify: false,
    quasar: false
  };
  if (!workspacePath) {
    return settings;
  }
  try {
    const packagePath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'package.json');
    if(!packagePath) {
      return settings;
    }
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
    if (packageJson.dependencies['bootstrap-vue']) {
      settings['bootstrap'] = true;
    }
    if (packageJson.dependencies['buefy']) {
      settings['buefy'] = true;
    }
    if (packageJson.dependencies['vuetify']) {
      settings['vuetify'] = true;
    }

    const quasarPath = ts.findConfigFile(
      workspacePath,
      ts.sys.fileExists,
      join('node_modules', 'quasar-framework', 'package.json')
    );
    if (quasarPath) {
      const quasarPkg = JSON.parse(fs.readFileSync(quasarPath, 'utf-8'));
      if (quasarPkg.vetur) {
        const provider = getQuasarTagProvider(workspacePath, quasarPkg);
        if (provider !== null) {
          allTagProviders.push(provider);
          settings['quasar'] = true;
        }
      }
    }

    for(const dep in packageJson.dependencies) {
      const runtimePath = ts.findConfigFile(
        workspacePath,
        ts.sys.fileExists,
        join('node_modules', dep, 'component-description.json')
      );      
      if (runtimePath) {
        const provider = JSON.parse(fs.readFileSync(runtimePath, 'utf-8'));
        if (provider) {
          allTagProviders.push(getExternalTagProvider(dep, provider.tags, provider.attributes));
          settings[dep] = true;
        }
      }
    }
  } catch (e) {}
  return settings;
}

export function getEnabledTagProviders(tagProviderSetting: CompletionConfiguration) {
  return allTagProviders.filter(p => tagProviderSetting[p.getId()] !== false);
}
