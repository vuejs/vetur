import * as path from 'path';
import * as ts from 'typescript';
import Uri from 'vscode-uri';
import { TextDocument } from 'vscode-languageserver-types';
import * as parseGitIgnore from 'parse-gitignore';

import { LanguageModelCache } from '../languageModelCache';
import { createUpdater, parseVue, isVue } from './preprocess';
import { getFileFsPath, getFilePath } from '../../utils/paths';
import * as bridge from './bridge';
import { DocumentInfo, DocumentRegion } from '../../services/documentService';

// Patch typescript functions to insert `import Vue from 'vue'` and `new Vue` around export default.
// NOTE: this is a global hack that all ts instances after is changed
const { createLanguageServiceSourceFile, updateLanguageServiceSourceFile } = createUpdater();
(ts as any).createLanguageServiceSourceFile = createLanguageServiceSourceFile;
(ts as any).updateLanguageServiceSourceFile = updateLanguageServiceSourceFile;

const vueSys: ts.System = {
  ...ts.sys,
  fileExists(path: string) {
    if (isVueProject(path)) {
      return ts.sys.fileExists(path.slice(0, -3));
    }
    return ts.sys.fileExists(path);
  },
  readFile(path, encoding) {
    if (isVueProject(path)) {
      const fileText = ts.sys.readFile(path.slice(0, -3), encoding);
      return fileText ? parseVue(fileText) : fileText;
    } else {
      const fileText = ts.sys.readFile(path, encoding);
      return fileText;
    }
  }
};

if (ts.sys.realpath) {
  const realpath = ts.sys.realpath;
  vueSys.realpath = function(path) {
    if (isVueProject(path)) {
      return realpath(path.slice(0, -3)) + '.ts';
    }
    return realpath(path);
  };
}

const defaultCompilerOptions: ts.CompilerOptions = {
  allowNonTsExtensions: true,
  allowJs: true,
  lib: ['lib.dom.d.ts', 'lib.es2017.d.ts'],
  target: ts.ScriptTarget.Latest,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.Preserve,
  allowSyntheticDefaultImports: true
};

export function getServiceHost(workspacePath: string, jsDocuments: LanguageModelCache<DocumentRegion>) {
  let currentScriptDoc: DocumentRegion;
  const versions = new Map<string, number>();
  const scriptDocs = new Map<string, DocumentRegion>();

  const parsedConfig = getParsedConfig(workspacePath);
  const files = parsedConfig.fileNames;
  const bridgeSnapshot = new DocumentSnapshot(
    new DocumentRegion(
      TextDocument.create(
        bridge.fileName,
        'vue',
        1,
        inferIsOldVersion(workspacePath) ? bridge.oldContent : bridge.content
      )
    )
  );
  const compilerOptions = {
    ...defaultCompilerOptions,
    ...parsedConfig.options
  };
  compilerOptions.allowNonTsExtensions = true;

  function updateCurrentTextDocument(doc: DocumentInfo) {
    const fileFsPath = getFileFsPath(doc.uri);
    const filePath = getFilePath(doc.uri);
    // When file is not in language service, add it
    if (!scriptDocs.has(fileFsPath)) {
      if (fileFsPath.endsWith('.vue')) {
        files.push(filePath);
      }
    }
    if (!currentScriptDoc || doc.uri !== currentScriptDoc.uri || doc.version !== currentScriptDoc.version) {
      currentScriptDoc = jsDocuments.get(doc.document);
      const lastDoc = scriptDocs.get(fileFsPath)!;
      if (lastDoc && currentScriptDoc.languageId !== lastDoc.languageId) {
        // if languageId changed, restart the language service; it can't handle file type changes
        jsLanguageService.dispose();
        jsLanguageService = ts.createLanguageService(host);
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
        return bridgeSnapshot.version.toString();
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
          jsDocuments.get(TextDocument.create(uri.toString(), 'vue', 0, ts.sys.readFile(fileName) || ''));
        return getScriptKind(doc.languageId);
      } else {
        if (fileName === bridge.fileName) {
          return ts.Extension.Ts;
        }
        // NOTE: Typescript 2.3 should export getScriptKindFromFileName. Then this cast should be removed.
        return (ts as any).getScriptKindFromFileName(fileName);
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
            extension: ts.Extension.Ts
          };
        }
        if (path.isAbsolute(name) || !isVue(name)) {
          return ts.resolveModuleName(name, containingFile, compilerOptions, ts.sys).resolvedModule;
        }
        const resolved = ts.resolveModuleName(name, containingFile, compilerOptions, vueSys).resolvedModule;
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
          jsDocuments.get(TextDocument.create(uri.toString(), 'vue', 0, ts.sys.readFile(resolvedFileName) || ''));
        const extension =
          doc.languageId === 'typescript'
            ? ts.Extension.Ts
            : doc.languageId === 'tsx'
            ? ts.Extension.Tsx
            : ts.Extension.Js;
        return { resolvedFileName, extension };
      });
    },
    getScriptSnapshot: (fileName: string) => {
      if (fileName === bridge.fileName) {
        return bridgeSnapshot;
      }
      const normalizedFileFsPath = getNormalizedFileFsPath(fileName);
      const doc = scriptDocs.get(normalizedFileFsPath);
      if (doc) {
        return new DocumentSnapshot(doc);
      }

      let fileText = ts.sys.readFile(normalizedFileFsPath) || '';
      const scriptInfo = new ScriptInfo(normalizedFileFsPath, fileText);
      if (!doc && isVue(fileName)) {
        // Note: This is required in addition to the parsing in embeddedSupport because
        // this works for .vue files that aren't even loaded by VS Code yet.
        fileText = parseVue(fileText);
      }
      return new ScriptSnapshot(scriptInfo);
    },
    getCurrentDirectory: () => workspacePath,
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    getNewLine: () => '\n'
  };

  let jsLanguageService = ts.createLanguageService(host);
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

function defaultIgnorePatterns(workspacePath: string) {
  const nodeModules = ['node_modules', '**/node_modules/*'];
  const gitignore = ts.findConfigFile(workspacePath, ts.sys.fileExists, '.gitignore');
  if (!gitignore) {
    return nodeModules;
  }
  const parsed: string[] = parseGitIgnore(gitignore);
  const filtered = parsed.filter(s => !s.startsWith('!'));
  return nodeModules.concat(filtered);
}

function getScriptKind(langId: string): ts.ScriptKind {
  return langId === 'typescript' ? ts.ScriptKind.TS : langId === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.JS;
}

function inferIsOldVersion(workspacePath: string): boolean {
  const packageJSONPath = ts.findConfigFile(workspacePath, ts.sys.fileExists, 'package.json');
  try {
    const packageJSON = packageJSONPath && JSON.parse(ts.sys.readFile(packageJSONPath)!);
    const vueStr = packageJSON.dependencies.vue || packageJSON.devDependencies.vue;
    // use a sloppy method to infer version, to reduce dep on semver or so
    const vueDep = vueStr.match(/\d+\.\d+/)[0];
    const sloppyVersion = parseFloat(vueDep);
    return sloppyVersion < 2.5;
  } catch (e) {
    return true;
  }
}

function getParsedConfig(workspacePath: string) {
  const configFilename =
    ts.findConfigFile(workspacePath, ts.sys.fileExists, 'tsconfig.json') ||
    ts.findConfigFile(workspacePath, ts.sys.fileExists, 'jsconfig.json');
  const configJson = (configFilename && ts.readConfigFile(configFilename, ts.sys.readFile).config) || {
    exclude: defaultIgnorePatterns(workspacePath)
  };
  // existingOptions should be empty since it always takes priority
  return ts.parseJsonConfigFileContent(
    configJson,
    ts.sys,
    workspacePath,
    /*existingOptions*/ {},
    configFilename,
    /*resolutionStack*/ undefined,
    [{ extension: 'vue', isMixedContent: true }]
  );
}

// export class ScriptInfo {
//   public version = 1;
//   public editRanges: { length: number; textChangeRange: ts.TextChangeRange }[] = [];

//   constructor(public fileName: string, public content: string) {
//     this.setContent(content);
//   }

//   private setContent(content: string): void {
//     this.content = content;
//   }

//   public updateContent(content: string): void {
//     this.editRanges = [];
//     this.setContent(content);
//     this.version++;
//   }

//   public editContent(start: number, end: number, newText: string): void {
//     // Apply edits
//     const prefix = this.content.substring(0, start);
//     const middle = newText;
//     const suffix = this.content.substring(end);
//     this.setContent(prefix + middle + suffix);

//     // Store edit range + new length of script
//     this.editRanges.push({
//       length: this.content.length,
//       textChangeRange: ts.createTextChangeRange(ts.createTextSpanFromBounds(start, end), newText.length)
//     });

//     // Update version #
//     this.version++;
//   }

//   public getTextChangeRangeBetweenVersions(startVersion: number, endVersion: number): ts.TextChangeRange {
//     if (startVersion === endVersion) {
//       // No edits!
//       return ts.unchangedTextChangeRange;
//     }

//     const initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
//     const lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);

//     const entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
//     return ts.collapseTextChangeRangesAcrossMultipleVersions(entries.map(e => e.textChangeRange));
//   }
// }

class DocumentSnapshot implements ts.IScriptSnapshot {
  public textSnapshot: string;
  public version: number;
  public editRanges: ts.TextChangeRange[];
  public get key() {
    return `${this.version}:${this.editRanges.length}`;
  }

  constructor(public documentRegion: DocumentRegion) {
    this.textSnapshot = documentRegion.document.getText();
    this.version = documentRegion.version;
    this.editRanges = documentRegion.editRanges.map(range =>
      ts.createTextChangeRange(
        ts.createTextSpanFromBounds(
          documentRegion.document.offsetAt(range.range.start),
          documentRegion.document.offsetAt(range.range.end)
        ),
        range.newText.length
      )
    );
  }

  public getText(start: number, end: number): string {
    return this.textSnapshot.substring(start, end);
  }

  public getLength(): number {
    return this.textSnapshot.length;
  }

  public getChangeRange(oldScript: ts.IScriptSnapshot): ts.TextChangeRange | undefined {
    const oldShim = <DocumentSnapshot>oldScript;
    return this.getTextChangeRange(oldShim);
  }

  public getTextChangeRange(oldVersion: DocumentSnapshot): ts.TextChangeRange | undefined {
    if (this.key === oldVersion.key) {
      // No edits!
      return ts.unchangedTextChangeRange;
    }

    return ts.collapseTextChangeRangesAcrossMultipleVersions(this.editRanges);
  }
}
export class ScriptInfo {
  public version = 1;
  public editRanges: { length: number; textChangeRange: ts.TextChangeRange }[] = [];

  constructor(public fileName: string, public content: string) {
    this.setContent(content);
  }

  private setContent(content: string): void {
    this.content = content;
  }

  public updateContent(content: string): void {
    this.editRanges = [];
    this.setContent(content);
    this.version++;
  }

  public editContent(start: number, end: number, newText: string): void {
    // Apply edits
    const prefix = this.content.substring(0, start);
    const middle = newText;
    const suffix = this.content.substring(end);
    this.setContent(prefix + middle + suffix);

    // Store edit range + new length of script
    this.editRanges.push({
      length: this.content.length,
      textChangeRange: ts.createTextChangeRange(ts.createTextSpanFromBounds(start, end), newText.length)
    });

    // Update version #
    this.version++;
  }

  public getTextChangeRangeBetweenVersions(startVersion: number, endVersion: number): ts.TextChangeRange {
    if (startVersion === endVersion) {
      // No edits!
      return ts.unchangedTextChangeRange;
    }

    const initialEditRangeIndex = this.editRanges.length - (this.version - startVersion);
    const lastEditRangeIndex = this.editRanges.length - (this.version - endVersion);

    const entries = this.editRanges.slice(initialEditRangeIndex, lastEditRangeIndex);
    return ts.collapseTextChangeRangesAcrossMultipleVersions(entries.map(e => e.textChangeRange));
  }
}

class ScriptSnapshot implements ts.IScriptSnapshot {
  public textSnapshot: string;
  public version: number;

  constructor(public scriptInfo: ScriptInfo) {
    this.textSnapshot = scriptInfo.content;
    this.version = scriptInfo.version;
  }

  public getText(start: number, end: number): string {
    return this.textSnapshot.substring(start, end);
  }

  public getLength(): number {
    return this.textSnapshot.length;
  }

  public getChangeRange(oldScript: ts.IScriptSnapshot): ts.TextChangeRange {
    const oldShim = <ScriptSnapshot>oldScript;
    return this.scriptInfo.getTextChangeRangeBetweenVersions(oldShim.version, this.version);
  }
}
