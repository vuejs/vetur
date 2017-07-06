import { IHTMLTagProvider, Priority } from './common';
import * as tags from 'vue-onsenui-helper-json/vue-onsenui-tags.json';
import * as attributes from 'vue-onsenui-helper-json/vue-onsenui-attributes.json';

export function getOnsenTagProvider(): IHTMLTagProvider {
  return {
    getId: () => 'onsen',
    priority: Priority.Library,
    isApplicable: languageId => languageId === 'vue-html',
    collectTags(collector) {
      for (const tagName in tags) {
        collector(tagName, tags[tagName].description || '');
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
      for (const attr of attrs) {
        const detail = findAttributeDetail(tag, attr);
        collector(attr, undefined, detail && detail.description || '');
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
