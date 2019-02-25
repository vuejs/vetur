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
  gridsomeTagProvider,
  getRuntimeTagProvider
} from './externalTagProviders';
export { getComponentInfoTagProvider as getComponentTags } from './componentInfoTagProvider';
export { IHTMLTagProvider } from './common';

import * as ts from 'typescript';
import * as fs from 'fs';
import { join } from 'path';
import { getNuxtTagProvider } from './nuxtTags';

export let allTagProviders: IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider(),
  getRouterTagProvider(),
  elementTagProvider,
  onsenTagProvider,
  bootstrapTagProvider,
  buefyTagProvider,
  vuetifyTagProvider,
  gridsomeTagProvider
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
    quasar: false,
    nuxt: false,
    gridsome: false
  };
  if (!workspacePath) {
    return settings;
  }
  try {
    const packagePath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'package.json');
    if (!packagePath) {
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
    if (
      packageJson.dependencies['nuxt'] ||
      packageJson.dependencies['nuxt-legacy'] ||
      packageJson.dependencies['nuxt-edge'] ||
      packageJson.dependencies['nuxt-ts'] ||
      packageJson.dependencies['nuxt-ts-edge']
    ) {
      const nuxtTagProvider = getNuxtTagProvider(workspacePath);
      if (nuxtTagProvider) {
        settings['nuxt'] = true;
        allTagProviders.push(nuxtTagProvider);
      }
    }
    if (packageJson.dependencies['gridsome']) {
      settings['gridsome'] = true;
    }

    for (const dep in packageJson.dependencies) {
      const runtimePkgPath = ts.findConfigFile(
        workspacePath,
        ts.sys.fileExists,
        join('node_modules', dep, 'package.json')
      );

      if (!runtimePkgPath) {
        continue;
      }

      const runtimePkg = JSON.parse(fs.readFileSync(runtimePkgPath, 'utf-8'));
      if (!runtimePkg) {
        continue;
      }

      const tagProvider = getRuntimeTagProvider(workspacePath, runtimePkg);
      if (!tagProvider) {
        continue;
      }

      allTagProviders.push(tagProvider);
      settings[dep] = true;
    }
  } catch (e) {}
  return settings;
}

export function getEnabledTagProviders(tagProviderSetting: CompletionConfiguration) {
  return allTagProviders.filter(p => tagProviderSetting[p.getId()] !== false);
}
