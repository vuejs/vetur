import type ts from 'typescript';
import path from 'path';
import { parse } from 'vue-eslint-parser';

import { URI } from 'vscode-uri';
import { getVueDocumentRegions } from '../../embeddedSupport/embeddedSupport';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  getTemplateTransformFunctions,
  componentHelperName,
  iterationHelperName,
  renderHelperName,
  componentDataName
} from './transformTemplate';
import { templateSourceMap } from './serviceHost';
import { generateSourceMap } from './sourceMap';
import { isVirtualVueTemplateFile, isVueFile } from './util';
import { ChildComponent } from '../vueInfoService';
import { kebabCase, snakeCase } from 'lodash';
import { RuntimeLibrary } from '../dependencyService';

const importedComponentName = '__vlsComponent';

export function parseVueScript(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getVueDocumentRegions(doc);
  const script = regions.getSingleTypeDocument('script');
  return script.getText();
}

function parseVueScriptSrc(text: string): string | undefined {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getVueDocumentRegions(doc);
  return regions.getImportedScripts()[0];
}

export function parseVueTemplate(text: string): string {
  const doc = TextDocument.create('test://test/test.vue', 'vue', 0, text);
  const regions = getVueDocumentRegions(doc);
  const template = regions.getSingleTypeDocument('template');

  if (template.languageId !== 'vue-html') {
    return '';
  }
  const rawText = template.getText();
  // skip checking on empty template
  if (rawText.replace(/\s/g, '') === '') {
    return '';
  }
  return rawText.replace(/ {10}/, '<template>') + '</template>';
}

export function createUpdater(
  tsModule: RuntimeLibrary['typescript'],
  allChildComponentsInfo: Map<string, ChildComponent[]>
) {
  const clssf = tsModule.createLanguageServiceSourceFile;
  const ulssf = tsModule.updateLanguageServiceSourceFile;
  const scriptKindTracker = new WeakMap<ts.SourceFile, ts.ScriptKind | undefined>();
  const modificationTracker = new WeakSet<ts.SourceFile>();
  const printer = tsModule.createPrinter();

  function modifySourceFile(
    fileName: string,
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot,
    version: string,
    scriptKind?: ts.ScriptKind
  ): void {
    if (modificationTracker.has(sourceFile)) {
      return;
    }

    if (isVueFile(fileName)) {
      modifyVueScript(tsModule, sourceFile);
      modificationTracker.add(sourceFile);
      return;
    }
  }

  /**
   * The transformed TS AST has synthetic nodes so language features would fail on them
   * Use printer to print the AST as re-parse the source to get a valid SourceFile
   */
  function recreateVueTemplateSourceFile(
    vueTemplateFileName: string,
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot
  ) {
    // TODO: share the logic of transforming the code into AST
    // with the template mode
    const vueText = scriptSnapshot.getText(0, scriptSnapshot.getLength());
    const templateCode = parseVueTemplate(vueText);
    const scriptSrc = parseVueScriptSrc(vueText);
    const program = parse(templateCode, { sourceType: 'module' });

    const childComponentNames = allChildComponentsInfo.get(vueTemplateFileName)?.map(c => snakeCase(c.name));
    let expressions: ts.Expression[] = [];
    try {
      expressions = getTemplateTransformFunctions(tsModule, childComponentNames).transformTemplate(
        program,
        templateCode
      );
      injectVueTemplate(tsModule, sourceFile, expressions, scriptSrc);
    } catch (err) {
      console.log(`Failed to transform template of ${vueTemplateFileName}`);
      console.error((err as Error).stack);
    }

    let newText = printer.printFile(sourceFile);

    if (allChildComponentsInfo.has(vueTemplateFileName)) {
      const childComponents = allChildComponentsInfo.get(vueTemplateFileName)!;
      newText += convertChildComponentsInfoToSource(childComponents);
    }

    const newSourceFile = tsModule.createSourceFile(
      vueTemplateFileName,
      newText,
      sourceFile.languageVersion,
      true /* setParentNodes: Need this to walk the AST */,
      tsModule.ScriptKind.TS
    );
    // Assign version to the new template sourceFile to avoid re-processing
    // *internal* property
    (newSourceFile as any).version = (sourceFile as any).version;
    (newSourceFile as any).scriptSnapshot = {
      getText: (start: number, end: number) => newText.substring(start, end),
      getLength: () => newText.length,
      getChangeRange: () => void 0
    };

    const templateFsPath = URI.file(vueTemplateFileName).fsPath;
    const sourceMapNodes = generateSourceMap(tsModule, sourceFile, newSourceFile);
    templateSourceMap[templateFsPath] = sourceMapNodes;
    templateSourceMap[templateFsPath.slice(0, -'.template'.length)] = sourceMapNodes;

    return newSourceFile;
  }

  function createLanguageServiceSourceFile(
    fileName: string,
    scriptSnapshot: ts.IScriptSnapshot,
    scriptTarget: ts.ScriptTarget,
    version: string,
    setNodeParents: boolean,
    scriptKind?: ts.ScriptKind
  ): ts.SourceFile {
    let sourceFile = clssf(fileName, scriptSnapshot, scriptTarget, version, setNodeParents, scriptKind);
    scriptKindTracker.set(sourceFile, scriptKind);
    if (isVirtualVueTemplateFile(fileName)) {
      sourceFile = recreateVueTemplateSourceFile(fileName, sourceFile, scriptSnapshot);
      modificationTracker.add(sourceFile);
    } else {
      modifySourceFile(fileName, sourceFile, scriptSnapshot, version, scriptKind);
    }
    return sourceFile;
  }

  function updateLanguageServiceSourceFile(
    sourceFile: ts.SourceFile,
    scriptSnapshot: ts.IScriptSnapshot,
    version: string,
    textChangeRange: ts.TextChangeRange,
    aggressiveChecks?: boolean
  ): ts.SourceFile {
    const scriptKind = scriptKindTracker.get(sourceFile);
    sourceFile = ulssf(sourceFile, scriptSnapshot, version, textChangeRange, aggressiveChecks);
    if (isVirtualVueTemplateFile(sourceFile.fileName)) {
      sourceFile = recreateVueTemplateSourceFile(sourceFile.fileName, sourceFile, scriptSnapshot);
      modificationTracker.add(sourceFile);
    } else {
      modifySourceFile(sourceFile.fileName, sourceFile, scriptSnapshot, version, scriptKind);
    }
    return sourceFile;
  }

  return {
    createLanguageServiceSourceFile,
    updateLanguageServiceSourceFile
  };
}

function modifyVueScript(tsModule: RuntimeLibrary['typescript'], sourceFile: ts.SourceFile): void {
  const exportDefaultObject = sourceFile.statements.find(
    st =>
      st.kind === tsModule.SyntaxKind.ExportAssignment &&
      (st as ts.ExportAssignment).expression.kind === tsModule.SyntaxKind.ObjectLiteralExpression
  ) as ts.ExportAssignment;
  if (exportDefaultObject) {
    // 1. add `import Vue from 'vue'
    // (the span of the inserted statement must be (0,0) to avoid overlapping existing statements)
    const setZeroPos = getWrapperRangeSetter(tsModule, { pos: 0, end: 0 });
    const vueImport = setZeroPos(
      tsModule.createImportDeclaration(
        undefined,
        undefined,
        setZeroPos(tsModule.createImportClause(tsModule.createIdentifier('__vueEditorBridge'), undefined as any)),
        setZeroPos(tsModule.createLiteral('vue-editor-bridge'))
      )
    );
    const statements: Array<ts.Statement> = sourceFile.statements as any;
    statements.unshift(vueImport);

    // 2. find the export default and wrap it in `__vueEditorBridge(...)` if it exists and is an object literal
    // (the span of the function construct call and *all* its members must be the same as the object literal it wraps)
    const objectLiteral = (exportDefaultObject as ts.ExportAssignment).expression as ts.ObjectLiteralExpression;
    const setObjPos = getWrapperRangeSetter(tsModule, objectLiteral);
    const vue = tsModule.setTextRange(tsModule.createIdentifier('__vueEditorBridge'), {
      pos: objectLiteral.pos,
      end: objectLiteral.pos + 1
    });
    (exportDefaultObject as any).expression = setObjPos(tsModule.createCall(vue, undefined, [objectLiteral]));
    setObjPos((exportDefaultObject.expression as ts.CallExpression).arguments!);
  }
}

/**
 * Wrap render function with component options in the script block
 * to validate its types
 */
export function injectVueTemplate(
  tsModule: RuntimeLibrary['typescript'],
  sourceFile: ts.SourceFile,
  renderBlock: ts.Expression[],
  scriptSrc?: string
): void {
  // add import statement for corresponding Vue file
  // so that we acquire the component type from it.
  let componentFilePath: string;

  if (scriptSrc) {
    // When script block refers external file (<script src="./MyComp.ts"></script>).
    // We need to strip `.ts` suffix to avoid a compilation error.
    componentFilePath = scriptSrc.replace(/\.ts$/, '');
  } else {
    // Importing original `.vue` file will get component type when the script is written by inline.
    componentFilePath = './' + path.basename(sourceFile.fileName.slice(0, -'.template'.length));
  }

  const createImportDeclaration = (
    decorators: readonly ts.Decorator[] | undefined,
    modifiers: readonly ts.Modifier[] | undefined,
    importClause: ts.ImportClause | undefined,
    moduleSpecifier: ts.Expression
  ) => {
    const [major, minor] = tsModule.version.split('.');
    if ((Number(major) === 4 && Number(minor) >= 8) || Number(major) > 4) {
      return tsModule.factory.createImportDeclaration(decorators, modifiers, importClause, moduleSpecifier);
    }
    return tsModule.createImportDeclaration(decorators, modifiers, importClause, moduleSpecifier);
  };

  const componentImport = createImportDeclaration(
    undefined,
    undefined,
    tsModule.createImportClause(tsModule.createIdentifier(importedComponentName), undefined),
    tsModule.createLiteral(componentFilePath)
  );

  const createImportSpecifier = (name: string) => {
    const [major, minor] = tsModule.version.split('.');
    if ((Number(major) === 4 && Number(minor) >= 5) || Number(major) > 4) {
      // @ts-expect-error
      return tsModule.createImportSpecifier(undefined, undefined, tsModule.createIdentifier(name));
    }
    return tsModule.createImportSpecifier(undefined, tsModule.createIdentifier(name));
  };

  // import helper type to handle Vue's private methods
  const helperImport = createImportDeclaration(
    undefined,
    undefined,
    tsModule.createImportClause(
      undefined,
      tsModule.createNamedImports([
        createImportSpecifier(renderHelperName),
        createImportSpecifier(componentHelperName),
        createImportSpecifier(iterationHelperName),
        createImportSpecifier(componentDataName)
      ])
    ),
    tsModule.createLiteral('vue-editor-bridge')
  );

  // wrap render code with a function decralation
  // with `this` type of component.
  const statements = renderBlock.map(exp => tsModule.createExpressionStatement(exp));
  const renderElement = tsModule.createExpressionStatement(
    tsModule.createCall(tsModule.createIdentifier(renderHelperName), undefined, [
      // Reference to the component
      tsModule.createIdentifier(importedComponentName),
      // A function simulating the render function
      tsModule.createFunctionExpression(
        undefined,
        undefined,
        undefined,
        undefined,
        [],
        undefined,
        tsModule.createBlock(statements)
      )
    ])
  );

  // replace the original statements with wrapped code.
  (sourceFile as any).statements = tsModule.createNodeArray([componentImport, helperImport, renderElement]);

  // Update external module indicator to the transformed template node,
  // otherwise symbols in this template (e.g. __Component) will be put
  // into global namespace and it causes duplicated identifier error.
  (sourceFile as any).externalModuleIndicator = componentImport;
}

/** Create a function that calls setTextRange on synthetic wrapper nodes that need a valid range */
function getWrapperRangeSetter(
  tsModule: RuntimeLibrary['typescript'],
  wrapped: ts.TextRange
): <T extends ts.TextRange>(wrapperNode: T) => T {
  return wrapperNode => tsModule.setTextRange(wrapperNode, wrapped);
}

function convertChildComponentsInfoToSource(childComponents: ChildComponent[]) {
  let src = '';
  childComponents.forEach(c => {
    const componentDataInterfaceName = componentDataName + '__' + snakeCase(c.name);
    const componentHelperInterfaceName = componentHelperName + '__' + snakeCase(c.name);

    const propTypeStrings: string[] = [];
    c.info?.componentInfo.props?.forEach(p => {
      let typeKey = kebabCase(p.name);
      if (typeKey.includes('-')) {
        typeKey = `'` + typeKey + `'`;
      }
      if (!p.required) {
        typeKey += '?';
      }

      if (p.typeString) {
        propTypeStrings.push(`${typeKey}: ${p.typeString}`);
      } else {
        propTypeStrings.push(`${typeKey}: any`);
      }
    });
    propTypeStrings.push('[other: string]: any');

    const onTypeStrings: string[] = [];
    c.info?.componentInfo.emits?.forEach(e => {
      let typeKey = kebabCase(e.name);
      if (typeKey.includes('-')) {
        typeKey = `'` + typeKey + `'`;
      }
      typeKey += '?';

      if (e.typeString) {
        onTypeStrings.push(`${typeKey}: ($event: any) => (${e.typeString})`);
      } else {
        onTypeStrings.push(`${typeKey}: ($event: any) => any`);
      }
    });

    src += `
interface ${componentDataInterfaceName}<T, TH> extends ${componentDataName}<T, TH> {
  props: { ${propTypeStrings.join(', ')} }
  on: { ${onTypeStrings.join(', ')} } & { [K in keyof T]?: (this: TH, $event: T[K]) => any; }
}
declare const ${componentHelperInterfaceName}: {
  <T>(
    vm: T,
    tag: string,
    data: ${componentDataInterfaceName}<Record<string, any>, T> & ThisType<T>,
    children: any[]
  ): any
}`;
  });

  return src;
}
