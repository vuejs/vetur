import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

import { IHTMLTagProvider, Priority } from './common';

import * as elementTags from 'element-helper-json/element-tags.json';
import * as elementAttributes from 'element-helper-json/element-attributes.json';

import * as onsenTags from 'vue-onsenui-helper-json/vue-onsenui-tags.json';
import * as onsenAttributes from 'vue-onsenui-helper-json/vue-onsenui-attributes.json';

import * as bootstrapTags from 'bootstrap-vue-helper-json/tags.json';
import * as bootstrapAttributes from 'bootstrap-vue-helper-json/attributes.json';

import * as gridsomeTags from 'gridsome-helper-json/gridsome-tags.json';
import * as gridsomeAttributes from 'gridsome-helper-json/gridsome-attributes.json';

export const elementTagProvider = getExternalTagProvider('element', elementTags, elementAttributes);
export const onsenTagProvider = getExternalTagProvider('onsen', onsenTags, onsenAttributes);
export const bootstrapTagProvider = getExternalTagProvider('bootstrap', bootstrapTags, bootstrapAttributes);
export const gridsomeTagProvider = getExternalTagProvider('gridsome', gridsomeTags, gridsomeAttributes);

/**
 * Get tag providers specified in workspace root's packaage.json
 */
export function getWorkspaceTagProvider(workspacePath: string, rootPkgJson: any): IHTMLTagProvider | null {
  if (!rootPkgJson.vetur) {
    return null;
  }

  const tagsPath = ts.findConfigFile(workspacePath, ts.sys.fileExists, rootPkgJson.vetur.tags);
  const attrsPath = ts.findConfigFile(workspacePath, ts.sys.fileExists, rootPkgJson.vetur.attributes);

  try {
    if (tagsPath && attrsPath) {
      const tagsJson = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
      const attrsJson = JSON.parse(fs.readFileSync(attrsPath, 'utf-8'));
      return getExternalTagProvider(rootPkgJson.name, tagsJson, attrsJson);
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Get tag providers specified in packaage.json's `vetur` key
 */
export function getDependencyTagProvider(workspacePath: string, depPkgJson: any): IHTMLTagProvider | null {
  if (!depPkgJson.vetur) {
    return null;
  }

  const tagsPath = ts.findConfigFile(
    workspacePath,
    ts.sys.fileExists,
    path.join('node_modules/', depPkgJson.name, depPkgJson.vetur.tags)
  );
  const attrsPath = ts.findConfigFile(
    workspacePath,
    ts.sys.fileExists,
    path.join('node_modules/', depPkgJson.name, depPkgJson.vetur.attributes)
  );

  try {
    if (tagsPath && attrsPath) {
      const tagsJson = JSON.parse(fs.readFileSync(tagsPath, 'utf-8'));
      const attrsJson = JSON.parse(fs.readFileSync(attrsPath, 'utf-8'));
      return getExternalTagProvider(depPkgJson.name, tagsJson, attrsJson);
    }
    return null;
  } catch (err) {
    return null;
  }
}

export function getExternalTagProvider(id: string, tags: any, attributes: any): IHTMLTagProvider {
  function findAttributeDetail(tag: string, attr: string) {
    return attributes[attr] || attributes[tag + '/' + attr];
  }

  return {
    getId: () => id,
    priority: Priority.Library,
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
        collector(attr, undefined, (detail && detail.description) || '');
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
