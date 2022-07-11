import { IHTMLTagProvider } from './common';
import { getHTML5TagProvider } from './htmlTags';
import { getVueTagProvider } from './vueTags';
import { getRouterTagProvider } from './routerTags';
import {
  elementTagProvider,
  onsenTagProvider,
  bootstrapTagProvider,
  gridsomeTagProvider,
  getDependencyTagProvider,
  getWorkspaceTagProvider
} from './externalTagProviders';

import fs from 'fs';
import { join } from 'path';
import { getNuxtTagProvider } from './nuxtTags';
import { normalizeFileNameResolve } from '../../../utils/paths';

export let allTagProviders: IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider(),
  getRouterTagProvider(),
  elementTagProvider,
  onsenTagProvider,
  bootstrapTagProvider,
  gridsomeTagProvider
];

export interface CompletionConfiguration {
  [provider: string]: boolean;
}

export function getTagProviderSettings(packagePath: string | undefined) {
  const settings: CompletionConfiguration = {
    '__vetur-workspace': true,
    html5: true,
    vue: true,
    router: false,
    element: false,
    onsen: false,
    bootstrap: false,
    buefy: false,
    vuetify: false,
    quasar: false, // Quasar v1+
    'quasar-framework': false, // Quasar pre v1
    nuxt: false,
    gridsome: false
  };
  try {
    if (!packagePath) {
      return settings;
    }

    const packageRoot = normalizeFileNameResolve(packagePath, '../');

    const rootPkgJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    const dependencies = rootPkgJson.dependencies || {};
    const devDependencies = rootPkgJson.devDependencies || {};

    if (dependencies['vue-router'] || devDependencies['vue-router']) {
      settings['vue-router'] = true;
    }
    if (dependencies['element-ui'] || devDependencies['element-ui']) {
      settings['element'] = true;
    }
    if (dependencies['vue-onsenui'] || devDependencies['vue-onsenui']) {
      settings['onsen'] = true;
    }
    if (dependencies['bootstrap-vue'] || devDependencies['bootstrap-vue']) {
      settings['bootstrap'] = true;
    }
    if (dependencies['buefy'] || devDependencies['buefy']) {
      settings['buefy'] = true;
    }
    if (dependencies['nuxt-buefy'] || devDependencies['nuxt-buefy']) {
      dependencies['buefy'] = true;
    }
    if (dependencies['vuetify'] || devDependencies['vuetify']) {
      settings['vuetify'] = true;
    }
    if (dependencies['@nuxtjs/vuetify'] || devDependencies['@nuxtjs/vuetify']) {
      dependencies['vuetify'] = true;
    }
    // Quasar v1+:
    if (dependencies['quasar'] || devDependencies['quasar']) {
      settings['quasar'] = true;
    }
    // Quasar pre v1 on non quasar-cli:
    if (dependencies['quasar-framework']) {
      settings['quasar-framework'] = true;
    }
    // Quasar pre v1 on quasar-cli:
    if (devDependencies['quasar-cli']) {
      // pushing dependency so we can check it
      // and enable Quasar later below in the for()
      dependencies['quasar-framework'] = '^0.0.17';
    }
    if (dependencies['nuxt'] || dependencies['nuxt-edge'] || devDependencies['nuxt'] || devDependencies['nuxt-edge']) {
      const nuxtTagProvider = getNuxtTagProvider(packageRoot);
      if (nuxtTagProvider) {
        settings['nuxt'] = true;
        allTagProviders.push(nuxtTagProvider);
      }
    }
    if (dependencies['gridsome']) {
      settings['gridsome'] = true;
    }

    const workspaceTagProvider = getWorkspaceTagProvider(packageRoot, rootPkgJson);
    if (workspaceTagProvider) {
      allTagProviders.push(workspaceTagProvider);
    }

    for (const dep of [...Object.keys(dependencies), ...Object.keys(devDependencies)]) {
      let runtimePkgJsonPath;
      try {
        runtimePkgJsonPath = require.resolve(join(dep, 'package.json'), { paths: [packageRoot] });
      } catch {
        continue;
      }

      const runtimePkgJson = JSON.parse(fs.readFileSync(runtimePkgJsonPath, 'utf-8'));
      if (!runtimePkgJson) {
        continue;
      }

      const depTagProvider = getDependencyTagProvider(packageRoot, dep, runtimePkgJson);
      if (!depTagProvider) {
        continue;
      }

      allTagProviders.push(depTagProvider);
      settings[dep] = true;
    }
  } catch (e) {
    console.error((e as Error).stack);
  }
  return settings;
}

export function getEnabledTagProviders(tagProviderSetting: CompletionConfiguration) {
  return allTagProviders.filter(p => tagProviderSetting[p.getId()] !== false);
}
