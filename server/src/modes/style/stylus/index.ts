import * as _ from 'lodash';
import * as emmet from 'vscode-emmet-helper';
import { CompletionList, TextEdit } from 'vscode-languageserver-types';
import * as StylusSupremacy from 'stylus-supremacy';

import { Priority } from '../emmet';
import { LanguageModelCache, getLanguageModelCache } from '../../languageModelCache';
import { LanguageMode } from '../../languageModes';
import { VueDocumentRegions } from '../../embeddedSupport';

import { provideCompletionItems } from './completion-item';
import { provideDocumentSymbols } from './symbols-finder';
import { stylusHover } from './stylus-hover';

export function getStylusMode(documentRegions: LanguageModelCache<VueDocumentRegions>): LanguageMode {
  const embeddedDocuments = getLanguageModelCache(10, 60, document => documentRegions.get(document).getEmbeddedDocument('stylus'));
  let baseIndentEnabled = false;
  let stylusSupremacyFormattingOptions: StylusSupremacy.FormattingOptions = {};
  return {
    getId: () => 'stylus',
    configure(config) {
      baseIndentEnabled = _.get(config, 'vetur.format.styleInitialIndent', false);
      stylusSupremacyFormattingOptions = StylusSupremacy.createFormattingOptions(_.get(config, 'vetur.format.stylus', {}));
    },
    onDocumentRemoved() {},
    dispose() {},
    doComplete(document, position) {
      const embedded = embeddedDocuments.get(document);
      
      const emmetCompletions: CompletionList = emmet.doComplete(document, position, 'stylus', {
        useNewEmmet: true,
        showExpandedAbbreviation: true,
        showAbbreviationSuggestions: true,
        syntaxProfiles: {},
        variables: {}
      });
      const emmetItems = _.map(emmetCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Emmet + i.label
        };
      });
      const lsCompletions = provideCompletionItems(embedded, position);
      const lsItems = _.map(lsCompletions.items, i => {
        return {
          ...i,
          sortText: Priority.Platform + i.label
        };
      });

      return {
        isIncomplete: true,
        items: _.concat(emmetItems, lsItems)
      };
    },
    findDocumentSymbols(document) {
      const embedded = embeddedDocuments.get(document);
      return provideDocumentSymbols(embedded);
    },
    doHover(document, position) {
      const embedded = embeddedDocuments.get(document);
      return stylusHover(embedded, position);
    },
    format(document, range, documentOptions) {
      // Note that this would have been `document.getText(range)`
      // See https://code.visualstudio.com/docs/extensionAPI/vscode-api#_a-nametextdocumentaspan-classcodeitem-id38textdocumentspan
      const inputText = document.getText();
      
      const tabStopChar = documentOptions.insertSpaces ? ' '.repeat(documentOptions.tabSize) : '\t';
      const newLineChar = inputText.includes('\r\n') ? '\r\n' : '\n'; // Note that this would have been `document.eol` ideally

      // Extract only the Stylus content from the whole document
      const inputLines = inputText.split(/\r?\n/);
      let inputBuffer = inputLines[range.start.line].substring(range.start.character) + '\n';
      for (let lineIndex = range.start.line + 1; lineIndex < range.end.line; lineIndex++) {
        inputBuffer += inputLines[lineIndex] + '\n';
      }
      inputBuffer += inputLines[range.end.line].substring(0, range.end.character);

      // Determine the base indentation for the Stylus content
      let baseIndent = '';
      if (range.start.line !== range.end.line && baseIndentEnabled) {
        baseIndent = _.get(inputLines[range.start.line].match(/^(\t|\s)+/), '0', '') + tabStopChar;
      }

      // Build the formatting options for Stylus Supremacy
      // See https://thisismanta.github.io/stylus-supremacy/#options
      const formattingOptions = {
        ...stylusSupremacyFormattingOptions,
        tabStopChar,
        newLineChar: '\n',
      };

      const formattedText = StylusSupremacy.format(inputBuffer, formattingOptions);

      // Add the base indentation and correct the new line characters
      const outputText = formattedText
        .split(/\n/)
        .map(line => line.length > 0 ? (baseIndent + line) : '')
        .join(newLineChar);

      return [TextEdit.replace(range, outputText)];
    },
  };
}

export const wordPattern = /(#?-?\d*\.\d\w*%?)|([$@#!.:]?[\w-?]+%?)|[$@#!.]/g;
