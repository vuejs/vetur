import {
  HTMLTagSpecification,
  IHTMLTagProvider,
  ITagSet,
  collectTagsDefault,
  collectAttributesDefault,
  collectValuesDefault,
  genAttribute,
  Priority
} from './common';

import { ComponentInfo } from '../../script/findComponents';

export function getComponentTags(components: ComponentInfo[]): IHTMLTagProvider {
  const tags: ITagSet = {};
  for (const comp of components) {
    const compName = comp.name;
    const props = comp.props ? comp.props.map(s => genAttribute(s.name, undefined, s.doc)) : [];
    tags[compName] = new HTMLTagSpecification('', props);
  }
  return {
    getId: () => 'component',
    priority: Priority.UserCode,
    collectTags: collector => collectTagsDefault(collector, tags),
    collectAttributes: (tag: string, collector: (attribute: string, type?: string, documentation?: string) => void) => {
      collectAttributesDefault(tag, collector, tags, []);
    },
    collectValues: (tag: string, attribute: string, collector: (value: string) => void) => {
      collectValuesDefault(tag, attribute, collector, tags, [], {});
    }
  };
}
