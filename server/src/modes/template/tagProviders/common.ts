interface TagCollector {
  (tag: string, label: string): void
}

export interface Attribute {
  label: string
  type?: string
  documentation?: string
}

interface AttributeCollector {
  (attribute: string, type?: string, documentation?: string): void
}
interface StandaloneAttribute {
  label: string
  documentation?: string
}

export interface IHTMLTagProvider {
  getId(): string;
  isApplicable(languageId: string): boolean;
  collectTags(collector: TagCollector): void;
  collectAttributes(tag: string, collector: AttributeCollector): void;
  collectValues(tag: string, attribute: string, collector: (value: string) => void): void;
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
  for (var tag in tagSet) {
    collector(tag, tagSet[tag].label);
  }
}

export function collectAttributesDefault(tag: string, collector: AttributeCollector, tagSet: ITagSet, globalAttributes: StandaloneAttribute[]): void {
  globalAttributes.forEach(attr => {
    var segments = attr.label.split(':');
    collector(segments[0], segments[1], attr.documentation);
  });
  if (tag) {
    var tags = tagSet[tag];
    if (tags) {
      var attributes = tags.attributes;
      for (let attr of attributes) {
        collector(attr.label, attr.type, attr.documentation);
      }
    }
  }
}

export function collectValuesDefault(tag: string, attribute: string, collector: (value: string) => void, tagSet: ITagSet, globalAttributes: StandaloneAttribute[], valueSets: IValueSets): void {
  function processAttributes (attributes: Attribute[]) {
    for (let attr of attributes) {
      let label = attr.label
      if (label !== attribute || !attr.type) {
        continue
      }
      var typeInfo = attr.type;
      if (typeInfo === 'v') {
        collector(attribute);
      } else {
        var values = valueSets[typeInfo];
        if (typeInfo === 'd') {
          console.log(values, 'hjejeejkle')
        }
        if (values) {
          values.forEach(collector);
        }
      }
    }
  };
  if (tag) {
    var tags = tagSet[tag];
    if (tags) {
      var attributes = tags.attributes;
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
  return { label, type, documentation }
}
