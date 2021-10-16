import { readFileSync } from 'fs';

export enum VueVersion {
  VPre25,
  V25,
  V30
}

function floatVersionToEnum(v: number) {
  if (v < 2.5) {
    return VueVersion.VPre25;
  } else if (v < 3.0) {
    return VueVersion.V25;
  } else {
    return VueVersion.V30;
  }
}

export function getVueVersionKey(version: VueVersion) {
  return Object.keys(VueVersion)?.[Object.values(VueVersion).indexOf(version)];
}

export function inferVueVersion(packagePath: string | undefined): VueVersion {
  const packageJSONPath = packagePath;
  try {
    if (!packageJSONPath) {
      throw new Error(`Can't find package.json in project`);
    }
    const packageJSON = packageJSONPath && JSON.parse(readFileSync(packageJSONPath, { encoding: 'utf-8' }));
    const vueDependencyVersion = packageJSON.dependencies?.vue || packageJSON.devDependencies?.vue;

    if (vueDependencyVersion) {
      // use a sloppy method to infer version, to reduce dep on semver or so
      const vueDep = vueDependencyVersion.match(/\d+(\.\d+)?/)[0];
      const sloppyVersion = parseFloat(vueDep);
      return floatVersionToEnum(sloppyVersion);
    }

    const nodeModulesVuePackagePath = require.resolve('vue/package.json', { paths: [packageJSONPath] });
    const nodeModulesVuePackageJSON = JSON.parse(readFileSync(nodeModulesVuePackagePath, { encoding: 'utf-8' })!);
    const nodeModulesVueVersion = parseFloat(nodeModulesVuePackageJSON.version.match(/\d+\.\d+/)[0]);

    return floatVersionToEnum(nodeModulesVueVersion);
  } catch (e) {
    console.error((e as Error).stack);
    return VueVersion.VPre25;
  }
}
