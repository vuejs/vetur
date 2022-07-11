import {
  HTMLTagSpecification,
  IHTMLTagProvider,
  ITagSet,
  collectTagsDefault,
  collectAttributesDefault,
  collectValuesDefault,
  genAttribute,
  TagProviderPriority,
  Attribute
} from './common';
import { ChildComponent } from '../../../services/vueInfoService';
import { MarkupContent } from 'vscode-languageserver-types';

export function getComponentInfoTagProvider(childComponents: ChildComponent[]): IHTMLTagProvider {
  const tagSet: ITagSet = {};

  for (const cc of childComponents) {
    const attributes: Attribute[] = [];
    if (cc.info) {
      cc.info.componentInfo.props?.forEach(p => {
        attributes.push(genAttribute(`:${p.name}`, undefined, { kind: 'markdown', value: p.documentation || '' }));
      });
      cc.info.componentInfo.emits?.forEach(e => {
        attributes.push(genAttribute(e.name, 'event', { kind: 'markdown', value: e.documentation || '' }));
      });
    }
    tagSet[cc.name] = new HTMLTagSpecification(
      {
        kind: 'markdown',
        value: cc.documentation || ''
      },
      attributes
    );
  }

  return {
    getId: () => 'component',
    priority: TagProviderPriority.UserCode,
    collectTags: collector => collectTagsDefault(collector, tagSet),
    collectAttributes: (
      tag: string,
      collector: (attribute: string, type?: string, documentation?: string | MarkupContent) => void
    ) => {
      collectAttributesDefault(tag, collector, tagSet, []);
    },
    collectValues: (tag: string, attribute: string, collector: (value: string) => void) => {
      collectValuesDefault(tag, attribute, collector, tagSet, [], {});
    }
  };
}
