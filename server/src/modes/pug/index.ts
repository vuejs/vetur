import { Position, Range } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { prettierPluginPugify } from '../../utils/prettier';
import { VLSFormatConfig } from '../../config';
import { getFileFsPath } from '../../utils/paths';
import { DependencyService } from '../../services/dependencyService';

export function getPugMode(dependencyService: DependencyService): LanguageMode {
  let config: any = {};

  return {
    getId() {
      return 'pug';
    },
    configure(c) {
      config = c;
    },
    format(document, currRange, formattingOptions) {
      if (config.vetur.format.defaultFormatter['pug'] === 'none') {
        return [];
      }

      const { value, range } = getValueAndRange(document, currRange);

      return prettierPluginPugify(
        dependencyService,
        value,
        getFileFsPath(document.uri),
        range,
        config.vetur.format as VLSFormatConfig,
        // @ts-expect-error
        'pug',
        false
      );
    },
    onDocumentRemoved() {},
    dispose() {}
  };
}

function getValueAndRange(document: TextDocument, currRange: Range): { value: string; range: Range } {
  let value = document.getText();
  let range = currRange;

  if (currRange) {
    const startOffset = document.offsetAt(currRange.start);
    const endOffset = document.offsetAt(currRange.end);
    value = value.substring(startOffset, endOffset);
  } else {
    range = Range.create(Position.create(0, 0), document.positionAt(value.length));
  }
  return { value, range };
}
