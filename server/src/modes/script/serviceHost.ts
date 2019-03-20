import * as path from 'path';
import * as ts from 'typescript';
import Uri from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-types';
import * as parseGitIgnore from 'parse-gitignore';

import { LanguageModelCache } from '../languageModelCache';
import { createUpdater, parseVue, isVue } from './preprocess';
import { getFileFsPath, getFilePath } from '../../utils/paths';
import * as bridge from './bridge';
import { T_TypeScript } from '../../services/dependencyService';

function patchTS(tsModule: T_TypeScript) {
  // Patch typescript functions to insert `import Vue from 'vue'` and `new Vue` around export default.
  // NOTE: this is a global hack that all ts instances after is changed
  const { createLanguageServiceSourceFile, updateLanguageServiceSourceFile } = createUpdater(tsModule);
  (tsModule as any).createLanguageServiceSourceFile = createLanguageServiceSourceFile;
  (tsModule as any).updateLanguageServiceSourceFile = updateLanguageServiceSourceFile;
}

function getVueSys(tsModule: T_TypeScript) {
  const vueSys: ts.System = {
    ...tsModule.sys,
    fileExists(path: string) {
      if (isVueProject(path)) {
        return tsModule.sys.fileExists(path.slice(0, -3));
      }
      return tsModule.sys.fileExists(path);
    },
    readFile(path, encoding) {
      if (isVueProject(path)) {
        const fileText = tsModule.sys.readFile(path.slice(0, -3), encoding);
        return fileText ? parseVue(fileText) : fileText;
      } else {
        const fileText = tsModule.sys.readFile(path, encoding);
        return fileText;
      }
    }
  };

  if (tsModule.sys.realpath) {
    const realpath = tsModule.sys.realpath;
    vueSys.realpath = function(path) {
      if (isVueProject(path)) {
        return realpath(path.slice(0, -3)) + '.ts';
      }
      return realpath(path);
    };
  }

  return vueSys;
}

function getDefaultCompilerOptions(tsModule: T_TypeScript) {
  const defaultCompilerOptions: ts.CompilerOptions = {
    allowNonTsExtensions: true,
    allowJs: true,
    lib: ['lib.dom.d.ts', 'lib.es2017.d.ts'],
    target: tsModule.ScriptTarget.Latest,
    moduleResolution: tsModule.ModuleResolutionKind.NodeJs,
    module: tsModule.ModuleKind.CommonJS,
    jsx: tsModule.JsxEmit.Preserve,
    allowSyntheticDefaultImports: true
  };

  return defaultCompilerOptions;
}

export function getServiceHost(
  tsModule: T_TypeScript,
  workspacePath: string,
  jsDocuments: LanguageModelCache<TextDocument>
) {
  patchTS(tsModule);
  const vueSys = getVueSys(tsModule);

  let currentScriptDoc: TextDocument;
  const versions = new Map<string, number>();
  const scriptDocs = new Map<string, TextDocument>();

  const parsedConfig = getParsedConfig(tsModule, workspacePath);
  const files = parsedConfig.fileNames;
  const isOldVersion = inferIsOldVersion(tsModule, workspacePath);
  const compilerOptions = {
    ...getDefaultCompilerOptions(tsModule),
    ...parsedConfig.options
  };
  compilerOptions.allowNonTsExtensions = true;

  function updateCurrentTextDocument(doc: TextDocument) {
    const fileFsPath = getFileFsPath(doc.uri);
    const filePath = getFilePath(doc.uri);
    // When file is not in language service, add it
    if (!scriptDocs.has(fileFsPath)) {
      if (fileFsPath.endsWith('.vue')) {
        files.push(filePath);
      }
    }
    if (!currentScriptDoc || doc.uri !== currentScriptDoc.uri || doc.version !== currentScriptDoc.version) {
      currentScriptDoc = jsDocuments.get(doc);
      const lastDoc = scriptDocs.get(fileFsPath);
      if (lastDoc && currentScriptDoc.languageId !== lastDoc.languageId) {
        // if languageId changed, restart the language service; it can't handle file type changes
        jsLanguageService.dispose();
        jsLanguageService = tsModule.createLanguageService(host);
      }
      scriptDocs.set(fileFsPath, currentScriptDoc);
      versions.set(fileFsPath, (versions.get(fileFsPath) || 0) + 1);
    }
    return {
      service: jsLanguageService,
      scriptDoc: currentScriptDoc
    };
  }

  // External Documents: JS/TS, non Vue documents
  function updateExternalDocument(filePath: string) {
    const ver = versions.get(filePath) || 0;
    versions.set(filePath, ver + 1);
  }

  function getScriptDocByFsPath(fsPath: string) {
    return scriptDocs.get(fsPath);
  }

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getScriptFileNames: () => files,
    getScriptVersion(fileName) {
      if (fileName === bridge.fileName) {
        return '0';
      }
      const normalizedFileFsPath = getNormalizedFileFsPath(fileName);
      const version = versions.get(normalizedFileFsPath);
      return version ? version.toString() : '0';
    },
    getScriptKind(fileName) {
      if (isVue(fileName)) {
        const uri = Uri.file(fileName);
        fileName = uri.fsPath;
        const doc =
          scriptDocs.get(fileName) ||
          jsDocuments.get(TextDocument.create(uri.toString(), 'vue', 0, tsModule.sys.readFile(fileName) || ''));
        return getScriptKind(tsModule, doc.languageId);
      } else {
        if (fileName === bridge.fileName) {
          return tsModule.Extension.Ts;
        }
        // NOTE: Typescript 2.3 should export getScriptKindFromFileName. Then this cast should be removed.
        return (tsModule as any).getScriptKindFromFileName(fileName);
      }
    },

    // resolve @types, see https://github.com/Microsoft/TypeScript/issues/16772
    getDirectories: vueSys.getDirectories,
    directoryExists: vueSys.directoryExists,
    fileExists: vueSys.fileExists,
    readFile: vueSys.readFile,
    readDirectory: vueSys.readDirectory,

    resolveModuleNames(moduleNames: string[], containingFile: string): ts.ResolvedModule[] {
      // in the normal case, delegate to ts.resolveModuleName
      // in the relative-imported.vue case, manually build a resolved filename
      return moduleNames.map(name => {
        if (name === bridge.moduleName) {
          return {
            resolvedFileName: bridge.fileName,
            extension: tsModule.Extension.Ts
          };
        }
        if (path.isAbsolute(name) || !isVue(name)) {
          return tsModule.resolveModuleName(name, containingFile, compilerOptions, tsModule.sys).resolvedModule;
        }
        const resolved = tsModule.resolveModuleName(name, containingFile, compilerOptions, vueSys).resolvedModule;
        if (!resolved) {
          return undefined as any;
        }
        if (!resolved.resolvedFileName.endsWith('.vue.ts')) {
          return resolved;
        }
        const resolvedFileName = resolved.resolvedFileName.slice(0, -3);
        const uri = Uri.file(resolvedFileName);
        const doc =
          scriptDocs.get(resolvedFileName) ||
          jsDocuments.get(TextDocument.create(uri.toString(), 'vue', 0, tsModule.sys.readFile(resolvedFileName) || ''));
        const extension =
          doc.languageId === 'typescript'
            ? tsModule.Extension.Ts
            : doc.languageId === 'tsx'
            ? tsModule.Extension.Tsx
            : tsModule.Extension.Js;
        return { resolvedFileName, extension };
      });
    },
    getScriptSnapshot: (fileName: string) => {
      if (fileName === bridge.fileName) {
        const text = isOldVersion ? bridge.oldContent : bridge.content;
        return {
          getText: (start, end) => text.substring(start, end),
          getLength: () => text.length,
          getChangeRange: () => void 0
        };
      }
      const normalizedFileFsPath = getNormalizedFileFsPath(fileName);
      const doc = scriptDocs.get(normalizedFileFsPath);
      let fileText = doc ? doc.getText() : tsModule.sys.readFile(normalizedFileFsPath) || '';
      if (!doc && isVue(fileName)) {
        // Note: This is required in addition to the parsing in embeddedSupport because
        // this works for .vue files that aren't even loaded by VS Code yet.
        fileText = parseVue(fileText);
      }
      return {
        getText: (start, end) => fileText.substring(start, end),
        getLength: () => fileText.length,
        getChangeRange: () => void 0
      };
    },
    getCurrentDirectory: () => workspacePath,
    getDefaultLibFileName: tsModule.getDefaultLibFilePath,
    getNewLine: () => '\n'
  };

  let jsLanguageService = tsModule.createLanguageService(host);
  return {
    updateCurrentTextDocument,
    updateExternalDocument,
    getScriptDocByFsPath,
    dispose: () => {
      jsLanguageService.dispose();
    }
  };
}

function getNormalizedFileFsPath(fileName: string): string {
  return Uri.file(fileName).fsPath;
}

function isVueProject(path: string) {
  return path.endsWith('.vue.ts') && !path.includes('node_modules');
}

function defaultIgnorePatterns(tsModule: T_TypeScript, workspacePath: string) {
  const nodeModules = ['node_modules', '**/node_modules/*'];
  const gitignore = tsModule.findConfigFile(workspacePath, tsModule.sys.fileExists, '.gitignore');
  if (!gitignore) {
    return nodeModules;
  }
  const parsed: string[] = parseGitIgnore(gitignore);
  const filtered = parsed.filter(s => !s.startsWith('!'));
  return nodeModules.concat(filtered);
}

function getScriptKind(tsModule: T_TypeScript, langId: string): ts.ScriptKind {
  return langId === 'typescript'
    ? tsModule.ScriptKind.TS
    : langId === 'tsx'
    ? tsModule.ScriptKind.TSX
    : tsModule.ScriptKind.JS;
}

function inferIsOldVersion(tsModule: T_TypeScript, workspacePath: string): boolean {
  const packageJSONPath = tsModule.findConfigFile(workspacePath, tsModule.sys.fileExists, 'package.json');
  try {
    const packageJSON = packageJSONPath && JSON.parse(tsModule.sys.readFile(packageJSONPath)!);
    const vueStr = packageJSON.dependencies.vue || packageJSON.devDependencies.vue;
    // use a sloppy method to infer version, to reduce dep on semver or so
    const vueDep = vueStr.match(/\d+\.\d+/)[0];
    const sloppyVersion = parseFloat(vueDep);
    return sloppyVersion < 2.5;
  } catch (e) {
    return true;
  }
}

function getParsedConfig(tsModule: T_TypeScript, workspacePath: string) {
  const configFilename =
    tsModule.findConfigFile(workspacePath, tsModule.sys.fileExists, 'tsconfig.json') ||
    tsModule.findConfigFile(workspacePath, tsModule.sys.fileExists, 'jsconfig.json');
  const configJson = (configFilename && tsModule.readConfigFile(configFilename, tsModule.sys.readFile).config) || {
    exclude: defaultIgnorePatterns(tsModule, workspacePath)
  };
  // existingOptions should be empty since it always takes priority
  return tsModule.parseJsonConfigFileContent(
    configJson,
    tsModule.sys,
    workspacePath,
    /*existingOptions*/ {},
    configFilename,
    /*resolutionStack*/ undefined,
    [{ extension: 'vue', isMixedContent: true }]
  );
}
