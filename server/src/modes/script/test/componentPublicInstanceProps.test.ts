import assert from 'assert';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { getComponentInfo } from '../componentInfo';
import { VueVersion } from '../../../utils/vueVersion';
import { PropInfo } from '../../../services/vueInfoService';

const fixtureDir = path.resolve(__dirname, '../../../../fixtures/componentPublicInstance');

interface PropShape {
  name: string;
  required: boolean;
  typeString: string | undefined;
  hasObjectValidator: boolean;
}

function propShape(prop: PropInfo): PropShape {
  return {
    name: prop.name,
    required: prop.required,
    typeString: prop.typeString,
    hasObjectValidator: prop.hasObjectValidator
  };
}

function loadParentInfo(vueVersion: VueVersion = VueVersion.V30) {
  const configPath = path.join(fixtureDir, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, fixtureDir);
  const servicesHost: ts.LanguageServiceHost = {
    getCompilationSettings: () => parsed.options,
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: fileName => {
      if (!fs.existsSync(fileName)) {
        return undefined;
      }
      return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName, 'utf8'));
    },
    getCurrentDirectory: () => fixtureDir,
    getDefaultLibFileName: options => ts.getDefaultLibFilePath(options),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories
  };
  const service = ts.createLanguageService(servicesHost);
  const parentPath = parsed.fileNames.find(fileName => fileName.endsWith('parent.ts'));
  assert.ok(parentPath, 'parent.ts missing from fixture program');

  return getComponentInfo(ts, service, parentPath!, [], vueVersion, {
    vetur: { completion: { tagCasing: 'pascal' } }
  });
}

suite('ComponentPublicInstance props', () => {
  test('reads Props from the ComponentPublicInstance type argument', function () {
    this.timeout(20000);
    const info = loadParentInfo();
    const children = info?.componentInfo.childComponents ?? [];
    const byName = new Map(children.map(child => [child.name, child.info?.componentInfo.props]));

    assert.deepStrictEqual((byName.get('AnyChild') ?? []).map(propShape), [
      { name: 'title', required: true, typeString: 'string', hasObjectValidator: false },
      { name: 'count', required: false, typeString: 'number | undefined', hasObjectValidator: false }
    ]);
    assert.deepStrictEqual((byName.get('IndexChild') ?? []).map(propShape), [
      { name: 'label', required: true, typeString: 'string', hasObjectValidator: false },
      { name: 'active', required: false, typeString: 'boolean | undefined', hasObjectValidator: false }
    ]);
    assert.deepStrictEqual((byName.get('ObjectChild') ?? []).map(propShape), [
      { name: 'title', required: true, typeString: 'string', hasObjectValidator: true },
      { name: 'count', required: true, typeString: 'number', hasObjectValidator: false }
    ]);
    assert.strictEqual(byName.get('EmptyChild'), undefined);
    assert.strictEqual(byName.get('PlainClassChild'), undefined);
  });

  test('reads Props from the Vue 2 CombinedVueInstance type argument', function () {
    this.timeout(20000);
    const info = loadParentInfo(VueVersion.V25);
    const children = info?.componentInfo.childComponents ?? [];
    const byName = new Map(children.map(child => [child.name, child.info?.componentInfo.props]));

    assert.deepStrictEqual((byName.get('Vue2Child') ?? []).map(propShape), [
      { name: 'value', required: true, typeString: 'string', hasObjectValidator: false },
      { name: 'count', required: false, typeString: 'number | undefined', hasObjectValidator: false }
    ]);
    assert.strictEqual(byName.get('AnyChild'), undefined);
  });
});
