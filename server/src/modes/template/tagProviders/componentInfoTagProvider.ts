import {
  HTMLTagSpecification,
  IHTMLTagProvider,
  ITagSet,
  collectTagsDefault,
  collectAttributesDefault,
  collectValuesDefault,
  genAttribute,
  Priority,
  Attribute
} from './common';
import { ChildComponent } from '../../../services/vueInfoService';
import { MarkupContent } from 'vscode-languageserver-types';

export function getComponentInfoTagProvider(childComponents: ChildComponent[]): IHTMLTagProvider {
  const tagSet: ITagSet = {};

  for (const cc of childComponents) {
    const props: Attribute[] = [];
    if (cc.info && cc.info.componentInfo.props) {
      cc.info.componentInfo.props.forEach(p => {
        props.push(genAttribute(p.name, undefined, { kind: 'markdown', value: p.documentation || '' }));
      });
    }
    tagSet[cc.name] = new HTMLTagSpecification(
      {
        kind: 'markdown',
        value: cc.documentation || ''
      },
      props
    );
    tagSet[cc.name.toLowerCase()] = tagSet[cc.name];
  }

  return {
    getId: () => 'component',
    priority: Priority.UserCode,
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
