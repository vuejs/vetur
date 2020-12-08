import { camelCase, kebabCase, upperFirst } from 'lodash';
import { EOL as NEW_LINE } from 'os';
import { basename } from 'path';
import type ts from 'typescript';
import { CompletionItem } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextEdit } from 'vscode-languageserver-types';
import { VLSFullConfig } from '../../config';
import { modulePathToValidIdentifier, toMarkupContent } from '../../utils/strings';
import { RuntimeLibrary } from '../../services/dependencyService';
import { ChildComponent, VueInfoService } from '../../services/vueInfoService';

export interface AutoImportSfcPlugin {
  setGetConfigure(fn: () => VLSFullConfig): void;
  setGetFilesFn(fn: () => string[]): void;
  setGetJSResolve(fn: (doc: TextDocument, item: CompletionItem) => CompletionItem): void;
  setGetTSScriptTarget(fn: () => ts.ScriptTarget | undefined): void;
  doComplete(document: TextDocument): CompletionItem[];
  isMyResolve(item: CompletionItem): boolean;
  doResolve(document: TextDocument, item: CompletionItem): CompletionItem;
}

/**
 * Auto import component in script when completion in template.
 * ## Implementation:
 * 1. Get all vue files path from ts language service host.
 * 2. Record more data in VueInfoService. Like: componentsDefine position.
 * 3. Provide completion list in template from vue files path
 * 4. Mock code to trigger auto import in TS for make importing component TextEdit.
 * 5. Add component define TextEdit from second step.
 * 6. Provide completion/resolve from fourth and fifth steps.
 *
 * ## Example
 * For mock code example in TS when componentName is `Item`.
 * The `=` is position for call completion/resolve in TS language service.
 * ```typescript
 * export default {
 *   components: {
 *     Item: ItemV=
 *   }
 * }
 * ```
 */
export function createAutoImportSfcPlugin(
  tsModule: RuntimeLibrary['typescript'],
  vueInfoService?: VueInfoService
): AutoImportSfcPlugin {
  let getConfigure: () => VLSFullConfig;
  let getVueFiles: () => string[];
  let getJSResolve: (doc: TextDocument, item: CompletionItem) => CompletionItem;
  let getTSScriptTarget: () => ts.ScriptTarget | undefined = () => undefined;

  function createMockDoc(document: TextDocument, componentInsertPos: number, mockPartContent: string) {
    const mockDocContent =
      document.getText().slice(0, componentInsertPos) + mockPartContent + document.getText().slice(componentInsertPos);
    const mockDoc = TextDocument.create(document.uri, document.languageId, document.version + 1, mockDocContent);
    return mockDoc;
  }

  function getJSImportEdits(
    nameForTriggerResolveInTs: string,
    mockDoc: TextDocument,
    offset: number,
    item: CompletionItem,
    componentName: string
  ) {
    const mockCompletionItem: CompletionItem = {
      label: nameForTriggerResolveInTs + 'Vue',
      data: {
        languageId: 'vue-html',
        uri: mockDoc.uri,
        offset,
        source: item.data.path
      }
    };
    const textEdits = getJSResolve(mockDoc, mockCompletionItem)?.additionalTextEdits?.map(edit => {
      edit.newText = edit.newText.replace(nameForTriggerResolveInTs + 'Vue', componentName);
      return edit;
    });
    return textEdits;
  }

  function getNoDuplicateComponentName(childComponents: ChildComponent[], componentCompletionName: string) {
    let index = 1;
    while (childComponents.some(el => el.name.toLowerCase() === componentCompletionName.toLowerCase())) {
      componentCompletionName = `${componentCompletionName}${index++}`;
    }
    return upperFirst(componentCompletionName);
  }

  return {
    setGetConfigure(fn) {
      getConfigure = fn;
    },
    setGetFilesFn(fn) {
      getVueFiles = fn;
    },
    setGetJSResolve(fn) {
      getJSResolve = fn;
    },
    setGetTSScriptTarget(fn) {
      getTSScriptTarget = fn;
    },
    doComplete(document): CompletionItem[] {
      const config = getConfigure();
      if (!config.vetur.completion.autoImport) {
        return [];
      }
      if (!getVueFiles || !getJSResolve || !vueInfoService) {
        return [];
      }

      const childComponentsPath =
        vueInfoService.getInfo(document)?.componentInfo.childComponents?.map(el => el.definition?.path) ?? [];
      return getVueFiles()
        .filter(fileName => !childComponentsPath.includes(fileName))
        .map(fileName => {
          let tagName = basename(fileName, '.vue');
          if (config.vetur.completion.tagCasing === 'kebab') {
            tagName = kebabCase(tagName);
          }
          const documentation = `
\`\`\`typescript
import ${upperFirst(camelCase(tagName))} from '${fileName}'
\`\`\`
`;

          return {
            label: tagName,
            insertText: tagName,
            documentation: toMarkupContent(documentation),
            data: {
              languageId: 'vue-html',
              uri: document.uri,
              isFromAutoImportVueService: true,
              path: fileName
            }
          };
        });
    },
    isMyResolve(item: CompletionItem) {
      return item.data?.isFromAutoImportVueService ?? false;
    },
    doResolve(document: TextDocument, item: CompletionItem) {
      const config = getConfigure();
      const componentInfo = vueInfoService?.getInfo(document)?.componentInfo;
      if (!componentInfo) {
        return item;
      }

      const componentDefine = componentInfo?.componentsDefine;
      const childComponents = componentInfo?.childComponents?.filter(c => !c.global);
      const nameForTriggerResolveInTs = modulePathToValidIdentifier(
        tsModule,
        item.data.path,
        getTSScriptTarget() ?? tsModule.ScriptTarget.ESNext
      );
      /**
       * have `components` property case
       */
      if (componentDefine && childComponents) {
        const componentName = getNoDuplicateComponentName(childComponents, nameForTriggerResolveInTs);
        const componentInsertPos = componentDefine?.insertPos;
        const mockPartContent = `${nameForTriggerResolveInTs}: ${nameForTriggerResolveInTs.slice(
          0,
          nameForTriggerResolveInTs.length - 2
        )}`;
        const mockDoc = createMockDoc(document, componentInsertPos, mockPartContent);

        const textEdits = getJSImportEdits(
          nameForTriggerResolveInTs,
          mockDoc,
          componentInsertPos + mockPartContent.length,
          item,
          componentName
        );
        if (textEdits) {
          const currentComponentText = document.getText().slice(componentDefine.start, componentDefine.end);
          const newInsertTexts = [];
          if (document.getText().charAt(componentInsertPos - 1) !== ',' && childComponents.length !== 0) {
            newInsertTexts.push(',');
          }
          if (currentComponentText.includes('\n')) {
            newInsertTexts.push(NEW_LINE);
            const textInLine = document
              .getText()
              .slice(
                document.getText().lastIndexOf('\n', componentDefine.start),
                document.getText().indexOf('\n', componentDefine.start)
              );
            newInsertTexts.push(textInLine.slice(1, textInLine.slice(1).search(/[^ ]/) + 1).repeat(2));
          } else if (childComponents.length !== 0) {
            newInsertTexts.push(' ');
          }
          newInsertTexts.push(componentName);
          textEdits.push(TextEdit.insert(document.positionAt(componentInsertPos), newInsertTexts.join('')));
        }
        item.additionalTextEdits = textEdits;
        item.insertText = config.vetur.completion.tagCasing === 'initial' ? componentName : kebabCase(componentName);
      } else if (componentInfo.insertInOptionAPIPos) {
        /**
         * no have `components` property case
         */
        const componentName = nameForTriggerResolveInTs;
        const mockEndPart = '},';
        const mockPartContent =
          `components: {${nameForTriggerResolveInTs}: ` +
          nameForTriggerResolveInTs.slice(0, nameForTriggerResolveInTs.length - 2) +
          mockEndPart;
        const mockDoc = createMockDoc(document, componentInfo.insertInOptionAPIPos, mockPartContent);

        const textEdits = getJSImportEdits(
          nameForTriggerResolveInTs,
          mockDoc,
          componentInfo.insertInOptionAPIPos + mockPartContent.length - mockEndPart.length,
          item,
          componentName
        );
        if (textEdits) {
          const newInsertTexts = [NEW_LINE];
          if (config.vetur.format.options.useTabs) {
            newInsertTexts.push('\t');
          } else {
            newInsertTexts.push(' '.repeat(config.vetur.format.options.tabSize));
          }
          newInsertTexts.push(`components: { ${componentName} },`);
          textEdits.push(
            TextEdit.insert(document.positionAt(componentInfo.insertInOptionAPIPos), newInsertTexts.join(''))
          );
        }
        item.additionalTextEdits = textEdits;
        item.insertText = config.vetur.completion.tagCasing === 'initial' ? componentName : kebabCase(componentName);
      }

      return item;
    }
  };
}
