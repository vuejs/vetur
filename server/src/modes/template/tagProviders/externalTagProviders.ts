import fs from 'fs';
import path from 'path';
import { kebabCase } from 'lodash';

import { IHTMLTagProvider, TagProviderPriority, getSameTagInSet } from './common';

import elementTags from 'element-helper-json/element-tags.json';
import elementAttributes from 'element-helper-json/element-attributes.json';

import onsenTags from 'vue-onsenui-helper-json/vue-onsenui-tags.json';
import onsenAttributes from 'vue-onsenui-helper-json/vue-onsenui-attributes.json';

import bootstrapTags from 'bootstrap-vue-helper-json/tags.json';
import bootstrapAttributes from 'bootstrap-vue-helper-json/attributes.json';

import gridsomeTags from 'gridsome-helper-json/gridsome-tags.json';
import gridsomeAttributes from 'gridsome-helper-json/gridsome-attributes.json';
import { findConfigFile } from '../../../utils/workspace';

export const elementTagProvider = getExternalTagProvider('element', elementTags, elementAttributes);
export const onsenTagProvider = getExternalTagProvider('onsen', onsenTags, onsenAttributes);
export const bootstrapTagProvider = getExternalTagProvider('bootstrap', bootstrapTags, bootstrapAttributes);
export const gridsomeTagProvider = getExternalTagProvider('gridsome', gridsomeTags, gridsomeAttributes);

/**
 * Get tag providers specified in workspace root's packaage.json
 */
export function getWorkspaceTagProvider(packageRoot: string, rootPkgJson: any): IHTMLTagProvider | null {
  if (!rootPkgJson.vetur) {
    return null;
  }
  const tagsPath = findConfigFile(packageRoot, rootPkgJson.vetur.tags);
  const attrsPath = findConfigFile(packageRoot, rootPkgJson.vetur.attributes);

  try {
    if (tagsPath && attrsPath) {
      const tagsJson = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
      const attrsJson = JSON.parse(fs.readFileSync(attrsPath, 'utf-8'));
      return getExternalTagProvider('__vetur-workspace', tagsJson, attrsJson);
    }
    return null;
  } catch (err) {
    console.error((err as Error).stack);
    return null;
  }
}

/**
 * Get tag providers specified in packaage.json's `vetur` key
 */
export function getDependencyTagProvider(
  packageRoot: string,
  depName: string,
  depPkgJson: any
): IHTMLTagProvider | null {
  if (!depPkgJson.vetur) {
    return null;
  }

  try {
    const tagsPath = require.resolve(path.join(depName, depPkgJson.vetur.tags), { paths: [packageRoot] });
    const attrsPath = require.resolve(path.join(depName, depPkgJson.vetur.attributes), {
      paths: [packageRoot]
    });

    const tagsJson = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
    const attrsJson = JSON.parse(fs.readFileSync(attrsPath, 'utf-8'));
    return getExternalTagProvider(depName, tagsJson, attrsJson);
  } catch (err) {
    console.error((err as Error).stack);
    return null;
  }
}

export function getExternalTagProvider(id: string, tags: any, attributes: any): IHTMLTagProvider {
  function findAttributeDetail(tag: string, attr: string) {
    return (
      attributes[attr] ||
      attributes[`${tag}/${attr}`] ||
      attributes[`${tag.toLowerCase}/${attr}`] ||
      attributes[`${kebabCase(tag)}/${attr}`]
    );
  }

  return {
    getId: () => id,
    priority: TagProviderPriority.Library,
    collectTags(collector) {
      for (const tagName in tags) {
        collector(tagName, tags[tagName].description || '');
      }
    },
    collectAttributes(tag, collector) {
      const attrs = getSameTagInSet<any>(tags, tag)?.attributes;
      if (!attrs) {
        return;
      }
      for (const attr of attrs) {
        const detail = findAttributeDetail(tag, attr);
        if (detail?.type === 'boolean') {
          collector(attr, 'v', (detail && detail.description) || '');
        } else if (detail?.type === 'event') {
          collector(attr, 'event', (detail && detail.description) || '');
        } else {
          collector(attr, undefined, (detail && detail.description) || '');
        }
      }
    },
    collectValues(tag, attr, collector) {
      const attrs = getSameTagInSet<any>(tags, tag)?.attributes;
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
