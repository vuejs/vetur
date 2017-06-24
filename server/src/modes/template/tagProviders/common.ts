interface TagCollector {
  (tag: string, label: string): void;
}

export interface Attribute {
  label: string;
  type?: string;
  documentation?: string;
}

interface AttributeCollector {
  (attribute: string, type?: string, documentation?: string): void;
}
interface StandaloneAttribute {
  label: string;
  type?: string;
  documentation?: string;
}

// Note: cannot items more than 10 for lexcial order
// smaller enum value means higher priority
export enum Priority {
  UserCode,
  Library,
  Framework,
  Platform,
}

export interface IHTMLTagProvider {
  getId(): string;
  isApplicable(languageId: string): boolean;
  collectTags(collector: TagCollector): void;
  collectAttributes(tag: string, collector: AttributeCollector): void;
  collectValues(tag: string, attribute: string, collector: (value: string) => void): void;

  /* a prefix for completion's lexcial order */
  readonly priority: Priority;
}

export interface ITagSet {
  [tag: string]: HTMLTagSpecification;
}

export class HTMLTagSpecification {
  constructor(public label: string, public attributes: Attribute[] = []) { }
}

export interface IValueSets {
  [tag: string]: string[];
}

export function collectTagsDefault(collector: TagCollector, tagSet: ITagSet): void {
  for (let tag in tagSet) {
    collector(tag, tagSet[tag].label);
  }
}

export function collectAttributesDefault(tag: string, collector: AttributeCollector, tagSet: ITagSet, globalAttributes: StandaloneAttribute[]): void {
  globalAttributes.forEach(attr => {
    collector(attr.label, attr.type, attr.documentation);
  });
  if (tag) {
    let tags = tagSet[tag];
    if (tags) {
      let attributes = tags.attributes;
      for (let attr of attributes) {
        collector(attr.label, attr.type, attr.documentation);
      }
    }
  }
}

export function collectValuesDefault(tag: string, attribute: string, collector: (value: string) => void, tagSet: ITagSet, globalAttributes: StandaloneAttribute[], valueSets: IValueSets): void {
  function processAttributes (attributes: Attribute[]) {
    for (let attr of attributes) {
      let label = attr.label;
      if (label !== attribute || !attr.type) {
        continue;
      }
      let typeInfo = attr.type;
      if (typeInfo === 'v') {
        collector(attribute);
      } else {
        let values = valueSets[typeInfo];
        if (values) {
          values.forEach(collector);
        }
      }
    }
  }
  if (tag) {
    let tags = tagSet[tag];
    if (tags) {
      let attributes = tags.attributes;
      if (attributes) {
        processAttributes(attributes);
      }
    }
  }
  processAttributes(globalAttributes);
  // TODO: add custom tag support
  // if (customTags) {
  //   var customTagAttributes = customTags[tag];
  //   if (customTagAttributes) {
  //     processAttributes(customTagAttributes);
  //   }
  // }
}

export function genAttribute(label: string, type?: string, documentation?: string):  Attribute {
  return { label, type, documentation };
}
