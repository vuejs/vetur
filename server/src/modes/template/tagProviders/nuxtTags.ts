import { join } from 'path';
import { getExternalTagProvider } from './externalTagProviders';

const NUXT_JSON_SOURCES = ['@nuxt/vue-app-edge', '@nuxt/vue-app', 'nuxt-helper-json'];

export function getNuxtTagProvider(packageRoot: string) {
  let nuxtTags, nuxtAttributes;
  for (const source of NUXT_JSON_SOURCES) {
    if (tryResolve(join(source, 'package.json'), packageRoot)) {
      nuxtTags = tryRequire(join(source, 'vetur/nuxt-tags.json'), packageRoot);
      nuxtAttributes = tryRequire(join(source, 'vetur/nuxt-attributes.json'), packageRoot);
      if (nuxtTags) {
        break;
      }
    }
  }

  const componentsTags = tryRequire(join(packageRoot, '.nuxt/vetur/tags.json'), packageRoot);
  const componentsAttributes = tryRequire(join(packageRoot, '.nuxt/vetur/attributes.json'), packageRoot);

  return getExternalTagProvider(
    'nuxt',
    { ...nuxtTags, ...componentsTags },
    { ...nuxtAttributes, ...componentsAttributes }
  );
}

function tryRequire(modulePath: string, findPath: string) {
  try {
    const resolved = tryResolve(modulePath, findPath);
    return resolved ? require(resolved) : undefined;
  } catch (_err) {}
}

function tryResolve(modulePath: string, findPath: string) {
  try {
    return require.resolve(modulePath, {
      paths: [findPath, __dirname]
    });
  } catch (_err) {}
}
