import { CompletionList, CompletionItemKind } from 'vscode-languageserver';
import { VueFileInfo } from '../../../services/vueInfoService';

export function doVueInterpolationComplete(vueFileInfo: VueFileInfo): CompletionList {
  const result: CompletionList = {
    isIncomplete: false,
    items: []
  };

  if (vueFileInfo.componentInfo.props) {
    vueFileInfo.componentInfo.props.forEach(p => {
      result.items.push({
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` prop`
        },
        kind: CompletionItemKind.Property
      });
    });
  }

  if (vueFileInfo.componentInfo.data) {
    vueFileInfo.componentInfo.data.forEach(p => {
      result.items.push({
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` data`
        },
        kind: CompletionItemKind.Property
      });
    });
  }

  if (vueFileInfo.componentInfo.computed) {
    vueFileInfo.componentInfo.computed.forEach(p => {
      result.items.push({
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` computed`
        },
        kind: CompletionItemKind.Property
      });
    });
  }

  if (vueFileInfo.componentInfo.methods) {
    vueFileInfo.componentInfo.methods.forEach(p => {
      result.items.push({
        label: p.name,
        documentation: {
          kind: 'markdown',
          value: p.documentation || `\`${p.name}\` method`
        },
        kind: CompletionItemKind.Method
      });
    });
  }

  return result;
}
