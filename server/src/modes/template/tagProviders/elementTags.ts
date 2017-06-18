import { IHTMLTagProvider } from './common';
import * as tags from 'element-helper-json/element-tags.json';
import * as attributes from 'element-helper-json/element-attributes.json';

export function getElementTagProvider(): IHTMLTagProvider {
  return {
    getId: () => 'element',
    isApplicable: languageId => languageId === 'vue-html',
    collectTags(collector) {
      for (const tagName in tags) {
        collector(tagName, tags[tagName].description);
      }
    },
    collectAttributes(tag, collector) {
      if (!tags[tag]) {
        return;
      }
      const attrs = tags[tag].attributes;
      if (!attrs) {
        return;
      }
      for (let attr of attrs) {
        const detail = findAttributeDetail(tag, attr);
        collector(attr, undefined, detail && detail.description);
      }
    },
    collectValues(tag, attr, collector) {
      if (!tags[tag]) {
        return;
      }
      const attrs = tags[tag].attributes;
      if (!attrs || attrs.indexOf(attr) < 0) {
        return;
      }
      const detail = findAttributeDetail(tag, attr);
      if (!detail || !detail.options) {
        return;
      }
      for (const option of detail.options) {
        collector(option);
      }
    }
  };
}

function findAttributeDetail(tag: string, attr: string) {
  return attributes[attr] || attributes[tag + '/' + attr];
}
