import { Range, Location } from 'vscode-languageserver-types';
import { VueFileInfo } from '../../services/vueInfoService';
import { URI } from 'vscode-uri';
import { kebabCase } from 'lodash';

export function getTagDefinition(vueFileInfo: VueFileInfo, tag: string): Location[] {
  if (!vueFileInfo.componentInfo.childComponents) {
    return [];
  }

  const childComponent = vueFileInfo.componentInfo.childComponents.find(
    cc => !!cc.definition && [tag, tag.toLowerCase(), kebabCase(tag)].includes(cc.name)
  );

  if (!childComponent) {
    return [];
  }

  const loc: Location = {
    uri: URI.file(childComponent.definition!.path).toString(),
    // TODO: Resolve actual default export range
    range: Range.create(0, 0, 0, 0)
  };
  return [loc];
}
