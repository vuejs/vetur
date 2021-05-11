import _ from 'lodash';
import * as emmet from 'vscode-emmet-helper';
import { CompletionList, TextEdit } from 'vscode-languageserver-types';
import { IStylusSupremacy } from './stylus-supremacy';

import { Priority } from '../emmet';
import { LanguageModelCache, getLanguageModelCache } from '../../../embeddedSupport/languageModelCache';
import { LanguageMode } from '../../../embeddedSupport/languageModes';
import { VueDocumentRegions } from '../../../embeddedSupport/embeddedSupport';

import { provideCompletionItems } from './completion-item';
import { provideDocumentSymbols } from './symbols-finder';
import { stylusHover } from './stylus-hover';
import { getFileFsPath } from '../../../utils/paths';
import { VLSFormatConfig } from '../../../config';
import { DependencyService } from '../../../services/dependencyService';
import { EnvironmentService } from '../../../services/EnvironmentService';
import { sync } from 'glob';
import { NULL_COMPLETION } from '../../nullMode';

import fs from 'fs';
import path from 'path';

export function getStylusMode(
  env: EnvironmentService,
  documentRegions: LanguageModelCache<VueDocumentRegions>,
  dependencyService: DependencyService
): LanguageMode {
  const embeddedDocuments = getLanguageModelCache(10, 60, document =>
    documentRegions.refreshAndGet(document).getSingleLanguageDocument('stylus')
  );

  return {
    getId: () => 'stylus',
    onDocumentRemoved() {},
    dispose() {},
    doComplete(document, position) {
      const embedded = embeddedDocuments.refreshAndGet(document);

      const lsCompletions = provideCompletionItems(embedded, position);
      const lsItems = _.map(lsCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Platform + i.label
        };
      });

      const emmetCompletions = emmet.doComplete(document, position, 'stylus', env.getConfig().emmet);
      if (!emmetCompletions) {
        return { isIncomplete: false, items: lsItems };
      } else {
        const emmetItems = emmetCompletions.items.map(i => {
          return {
            ...i,
            sortText: Priority.Emmet + i.label
          };
        });
        return {
          isIncomplete: emmetCompletions.isIncomplete,
          items: _.concat(emmetItems, lsItems)
        };
      }
    },
    findDocumentSymbols(document) {
      const embedded = embeddedDocuments.refreshAndGet(document);
      return provideDocumentSymbols(embedded);
    },
    doHover(document, position) {
      const embedded = embeddedDocuments.refreshAndGet(document);
      return stylusHover(embedded, position);
    },
    format(document, range, formatParams) {
      if (env.getConfig().vetur.format.defaultFormatter.stylus === 'none') {
        return [];
      }

      const stylusSupremacy: IStylusSupremacy = dependencyService.get('stylus-supremacy', getFileFsPath(document.uri))
        .module;

      const inputText = document.getText(range);

      const vlsFormatConfig = env.getConfig().vetur.format as VLSFormatConfig;
      const tabStopChar = vlsFormatConfig.options.useTabs ? '\t' : ' '.repeat(vlsFormatConfig.options.tabSize);

      // Note that this would have been `document.eol` ideally
      const newLineChar = inputText.includes('\r\n') ? '\r\n' : '\n';

      // Determine the base indentation for the multi-line Stylus content
      let baseIndent = '';
      if (range.start.line !== range.end.line) {
        const styleTagLine = document.getText().split(/\r?\n/)[range.start.line];
        if (styleTagLine) {
          baseIndent = _.get(styleTagLine.match(/^(\t|\s)+/), '0', '');
        }
      }

      // Add one more indentation when `vetur.format.styleInitialIndent` is set to `true`
      if (env.getConfig().vetur.format.scriptInitialIndent) {
        baseIndent += tabStopChar;
      }

      // Build the formatting options for Stylus Supremacy
      // See https://thisismanta.github.io/stylus-supremacy/#options
      const stylusSupremacyFormattingOptions = stylusSupremacy.createFormattingOptions(
        env.getConfig().stylusSupremacy || {}
      );

      // read .stylintrc file if it exists and give it priority over VS Code settings
      const stylintrcPath = path.join(env.getProjectRoot(), '.stylintrc');
      let stylusStylintOptions = {};
      if (fs.existsSync(stylintrcPath)) {
        try {
          const stylintOptions = JSON.parse(fs.readFileSync(stylintrcPath, 'utf-8'));
          stylusStylintOptions = stylusSupremacy.createFormattingOptionsFromStylint(stylintOptions);
        } catch (err) {
          console.error(err);
        }
      }

      const formattingOptions = {
        ...stylusSupremacyFormattingOptions,
        ...stylusStylintOptions,
        tabStopChar,
        newLineChar: '\n'
      };

      const formattedText = stylusSupremacy.format(inputText, formattingOptions);

      // Add the base indentation and correct the new line characters
      const outputText = formattedText
        .split(/\n/)
        .map(line => (line.length > 0 ? baseIndent + line : ''))
        .join(newLineChar);

      return [TextEdit.replace(range, outputText)];
    }
  };
}

export const wordPattern = /(#?-?\d*\.\d\w*%?)|([$@#!.:]?[\w-?]+%?)|[$@#!.]/g;
