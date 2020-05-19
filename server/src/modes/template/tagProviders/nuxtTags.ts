import { join } from 'path';
import { getExternalTagProvider } from './externalTagProviders';

const NUXT_JSON_SOURCES = ['@nuxt/vue-app-edge', '@nuxt/vue-app', 'nuxt-helper-json'];

export function getNuxtTagProvider(workspacePath: string) {
  let nuxtTags, nuxtAttributes;
  for (const source of NUXT_JSON_SOURCES) {
    if (tryResolve(join(source, 'package.json'), workspacePath)) {
      nuxtTags = tryRequire(join(source, 'vetur/nuxt-tags.json'), workspacePath);
      nuxtAttributes = tryRequire(join(source, 'vetur/nuxt-attributes.json'), workspacePath);
      if (nuxtTags) {
        break;
      }
    }
  }

  const componentsTags = tryRequire(join(workspacePath, '.nuxt/vetur/tags.json'), workspacePath);
  const componentsAttributes = tryRequire(join(workspacePath, '.nuxt/vetur/attributes.json'), workspacePath);

  return getExternalTagProvider(
    'nuxt',
    { ...nuxtTags, ...componentsTags },
    { ...nuxtAttributes, ...componentsAttributes }
  );
}

function tryRequire(modulePath: string, workspacePath: string) {
  try {
    const resolved = tryResolve(modulePath, workspacePath);
    return resolved ? require(resolved) : undefined;
  } catch (_err) {}
}

function tryResolve(modulePath: string, workspacePath: string) {
  try {
    return require.resolve(modulePath, {
      paths: [workspacePath, __dirname]
    });
  } catch (_err) {}
}
