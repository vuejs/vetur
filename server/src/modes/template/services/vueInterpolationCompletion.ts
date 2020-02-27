import { CompletionList, CompletionItemKind, CompletionItem } from 'vscode-languageserver';
import { VueFileInfo, DataInfo, MemberInfo } from '../../../services/vueInfoService';
import { T_TypeScript } from '../../../services/dependencyService';

import {} from 'vscode-languageclient';

export function doVueInterpolationComplete(vueFileInfo: VueFileInfo, tsModule?: T_TypeScript): CompletionList {
  const result: CompletionList = {
    isIncomplete: false,
    items: []
  };

  if (vueFileInfo.componentInfo.props) {
    // vueFileInfo.componentInfo.props.forEach(p => {
    //   result.items.push({
    //     label: p.name,
    //     documentation: {
    //       kind: 'markdown',
    //       value: p.documentation || `\`${p.name}\` prop`
    //     },
    //     kind: CompletionItemKind.Property
    //   });
    // });
    result.items.push(...getCompletionItems(vueFileInfo.componentInfo.props, 'prop'));
  }

  if (vueFileInfo.componentInfo.data) {
    // const v = tsModule?.textSpanEnd({} as any);

    // tsModule.transpile(vueFileInfo.componentInfo.data[0].documentation)
    // tsModule.create
    // vueFileInfo.componentInfo.data.forEach(p => {
    //   result.items.push(
    //     ...[
    //       {
    //         label: p.name,
    //         documentation: {
    //           kind: 'markdown',
    //           value: p.documentation || `\`${p.name}\` data`
    //         },
    //         kind: CompletionItemKind.Property
    //       }
    //     ]
    //   );
    // });

    // for (const d of vueFileInfo.componentInfo.data) {
    //   result.items.push({
    //     label: d.name,
    //     documentation: {
    //       kind: 'markdown',
    //       value: d.documentation || `\`${d.name}\` data`
    //     },
    //     kind: d.kind || CompletionItemKind.Property
    //   });

    //   for (const m of d.members) {
    //     result.items.push({
    //       label: `${d.name}.${m.name}`,
    //       documentation: {
    //         kind: 'markdown',
    //         value: m.documentation || `\`${m.name}\` data`
    //       },
    //       kind: m.kind || CompletionItemKind.Property
    //     });
    //   }
    // }

    result.items.push(...getCompletionItems(vueFileInfo.componentInfo.data, 'data'));
  }

  if (vueFileInfo.componentInfo.computed) {
    // vueFileInfo.componentInfo.computed.forEach(p => {
    //   result.items.push({
    //     label: p.name,
    //     documentation: {
    //       kind: 'markdown',
    //       value: p.documentation || `\`${p.name}\` computed`
    //     },
    //     kind: CompletionItemKind.Property
    //   });
    // });
    result.items.push(...getCompletionItems(vueFileInfo.componentInfo.computed, 'computed'));
  }

  if (vueFileInfo.componentInfo.methods) {
    // vueFileInfo.componentInfo.methods.forEach(p => {
    //   result.items.push({
    //     label: p.name,
    //     documentation: {
    //       kind: 'markdown',
    //       value: p.documentation || `\`${p.name}\` method`
    //     },
    //     kind: CompletionItemKind.Method
    //   });
    // });
    result.items.push(...getCompletionItems(vueFileInfo.componentInfo.methods, 'method'));
  }

  return result;
}

function* getCompletionItems(
  items: MemberInfo[],
  documentationType: string,
  parentLabel = ''
): Generator<CompletionItem> {
  for (let i = 0; i < items.length; i++) {
    const data = items[i];
    const label = !!parentLabel ? `${parentLabel}.${data.name}` : data.name;

    yield {
      label,
      documentation: {
        kind: 'markdown',
        value: data.documentation || `\`${data.name}\` ${documentationType}`
      },
      kind: data.kind || CompletionItemKind.Property
    };

    if (data.members) {
      yield* getCompletionItems(data.members, documentationType, label);
    }
  }

  // yield {
  //   label,
  //   documentation: {
  //     kind: 'markdown',
  //     value: data.documentation || `\`${data.name}\` ${documentationType}`
  //   },
  //   kind: data.kind || CompletionItemKind.Property
  // } as CompletionItem;

  // for (let i = 0; i < data.members.length; i++) {
  //   const info = data.members[i];

  //   yield* getCompletionItems(info, documentationType, label);
  // }
}
