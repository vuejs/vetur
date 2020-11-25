import { kebabCase } from 'lodash';
import type ts from 'typescript';
import { BasicComponentInfo } from '../../config';
import { RuntimeLibrary } from '../../services/dependencyService';
import { InternalChildComponent } from './childComponents';
import { buildDocumentation, getDefaultExportNode } from './componentInfo';

export function getGlobalComponents(
  tsModule: RuntimeLibrary['typescript'],
  service: ts.LanguageService,
  componentInfos: BasicComponentInfo[],
  tagCasing = 'kebab'
): InternalChildComponent[] {
  const program = service.getProgram();
  if (!program) {
    return [];
  }

  const checker = program.getTypeChecker();

  const result: InternalChildComponent[] = [];
  componentInfos.forEach(info => {
    const sourceFile = program.getSourceFile(info.path);
    if (!sourceFile) {
      return;
    }

    const defaultExportNode = getDefaultExportNode(tsModule, sourceFile);
    if (!defaultExportNode) {
      return;
    }

    const defaultExportSymbol = checker.getTypeAtLocation(defaultExportNode);
    if (!defaultExportSymbol) {
      return;
    }

    const name = tagCasing === 'kebab' ? kebabCase(info.name) : info.name;

    result.push({
      name,
      documentation: buildDocumentation(tsModule, defaultExportSymbol.symbol, checker),
      definition: {
        path: sourceFile.fileName,
        start: defaultExportNode.getStart(sourceFile, true),
        end: defaultExportNode.getEnd()
      },
      defaultExportNode
    });
  });

  return result;
}
