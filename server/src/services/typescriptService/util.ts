export function isVueFile(path: string) {
  return path.endsWith('.vue');
}

/**
 * If the path ends with `.vue.ts`, it's a `.vue` file pre-processed by Vetur
 * to be used in TS Language Service
 */
export function isVirtualVueFile(path: string) {
  return path.endsWith('.vue.ts') && !path.includes('node_modules');
}

/**
 * If the path ends with `.vue.template`, it's a `.vue` file's template part
 * pre-processed by Vetur to calculate template diagnostics in TS Language Service
 */
export function isVirtualVueTemplateFile(path: string) {
  return path.endsWith('.vue.template');
}
