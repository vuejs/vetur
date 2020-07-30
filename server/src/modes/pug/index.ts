import { TextDocument, Position, Range } from 'vscode-languageserver-types';
import { LanguageMode } from '../../embeddedSupport/languageModes';
import { prettierify } from '../../utils/prettier';
import { VLSFormatConfig } from '../../config';
import { getFileFsPath } from '../../utils/paths';

export function getPugMode(): LanguageMode {
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

      const foo = prettierify(
        value,
        getFileFsPath(document.uri),
        range,
        config.vetur.format as VLSFormatConfig,
        'pug',
        false
      );

      return foo;
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
