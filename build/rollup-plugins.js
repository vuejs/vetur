export function linkVlsInCLI() {
  return {
    name: 'link-vls-in-cli',
    resolveId(source, importer) {
      if (source === './services/vls') {
        return { id: './vls.js', external: true };
      }
      return null;
    }
  };
}

export function ignorePartSourcemap() {
  return {
    name: 'ignore-part-sourcemap',
    transform(code, id) {
      if (id.endsWith('typescript/lib/typescript.js')) {
        return null;
      }

      if (id.includes('node_modules')) {
        return { code, map: { mappings: '' } };
      }

      return null;
    }
  };
}
