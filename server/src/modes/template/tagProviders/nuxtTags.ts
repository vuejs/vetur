import * as fs from 'fs';
import * as path from 'path';
import { getExternalTagProvider } from './externalTagProviders';

const NUXT_VUE_APP_PATH = 'node_modules/@nuxt/vue-app';
const NUXT_EDGE_VUE_APP_PATH = 'node_modules/@nuxt/vue-app-edge';

export function getNuxtTagProvider(workspacePath: string) {
  if (fs.existsSync(path.resolve(workspacePath, NUXT_VUE_APP_PATH, 'package.json'))) {
    const { nuxtTags, nuxtAttributes } = getNuxtTagsAndAttributes(NUXT_VUE_APP_PATH);
    return getExternalTagProvider('nuxt', nuxtTags, nuxtAttributes);
  }

  if (fs.existsSync(path.resolve(workspacePath, NUXT_EDGE_VUE_APP_PATH, 'package.json'))) {
    const { nuxtTags, nuxtAttributes } = getNuxtTagsAndAttributes(NUXT_EDGE_VUE_APP_PATH);
    return getExternalTagProvider('nuxt', nuxtTags, nuxtAttributes);
  }
}

function getNuxtTagsAndAttributes(nuxtVueAppPath: string) {
  let nuxtVer = '0.0.0';
  try {
    nuxtVer = require(path.resolve(nuxtVueAppPath, 'package.json')).version;
  } catch (err) {}

  if (nuxtVer < '2.4.0') {
    const nuxtTags = require('nuxt-helper-json/nuxt-tags.json');
    const nuxtAttributes = require('nuxt-helper-json/nuxt-attributes.json');

    return {
      nuxtTags,
      nuxtAttributes
    };
  } else {
    const nuxtTags = require(path.resolve(nuxtVueAppPath, 'vetur/nuxt-tags.json'));
    const nuxtAttributes = require(path.resolve(nuxtVueAppPath, 'vetur/nuxt-attributes.json'));

    return {
      nuxtTags,
      nuxtAttributes
    };
  }
}
