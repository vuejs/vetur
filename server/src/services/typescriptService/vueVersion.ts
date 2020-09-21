import path from 'path';

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

export function inferVueVersion(tsModule: T_TypeScript, workspacePath: string): VueVersion {
  const packageJSONPath = tsModule.findConfigFile(workspacePath, tsModule.sys.fileExists, 'package.json');
  try {
    const packageJSON = packageJSONPath && JSON.parse(tsModule.sys.readFile(packageJSONPath)!);
    const vueDependencyVersion = packageJSON.dependencies.vue || packageJSON.devDependencies.vue;

    if (vueDependencyVersion) {
      // use a sloppy method to infer version, to reduce dep on semver or so
      const vueDep = vueDependencyVersion.match(/\d+\.\d+/)[0];
      const sloppyVersion = parseFloat(vueDep);
      return floatVersionToEnum(sloppyVersion);
    }

    const nodeModulesVuePackagePath = tsModule.findConfigFile(
      path.resolve(workspacePath, 'node_modules/vue'),
      tsModule.sys.fileExists,
      'package.json'
    );
    const nodeModulesVuePackageJSON =
      nodeModulesVuePackagePath && JSON.parse(tsModule.sys.readFile(nodeModulesVuePackagePath)!);
    const nodeModulesVueVersion = parseFloat(nodeModulesVuePackageJSON.version.match(/\d+\.\d+/)[0]);

    return floatVersionToEnum(nodeModulesVueVersion);
  } catch (e) {
    return VueVersion.VPre25;
  }
}
