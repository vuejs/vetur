import { window, workspace, DecorationOptions, DecorationRenderOptions, Disposable, Range, TextDocument } from 'vscode';

const MAX_DECORATORS = 500;

const decorationType: DecorationRenderOptions = {
  before: {
    contentText: ' ',
    border: 'solid 0.1em #000',
    margin: '0.1em 0.2em 0 0.2em',
    width: '0.8em',
    height: '0.8em'
  },
  dark: {
    before: {
      border: 'solid 0.1em #eee'
    }
  }
};

export function activateColorDecorations(decoratorProvider: (uri: string) => Thenable<Range[]>, supportedLanguages: { [id: string]: boolean }, isDecoratorEnabled: (languageId: string) => boolean): Disposable {

  const disposables: Disposable[] = [];

  const colorsDecorationType = window.createTextEditorDecorationType(decorationType);
  disposables.push(colorsDecorationType);

  const decoratorEnablement = {};
  for (const languageId in supportedLanguages) {
    decoratorEnablement[languageId] = isDecoratorEnabled(languageId);
  }

  const pendingUpdateRequests: { [key: string]: NodeJS.Timer; } = {};

  window.onDidChangeVisibleTextEditors(editors => {
    for (const editor of editors) {
      triggerUpdateDecorations(editor.document);
    }
  }, null, disposables);

  workspace.onDidChangeTextDocument(event => triggerUpdateDecorations(event.document), null, disposables);

  // track open and close for document languageId changes
  workspace.onDidCloseTextDocument(event => triggerUpdateDecorations(event, true));
  workspace.onDidOpenTextDocument(event => triggerUpdateDecorations(event));

  workspace.onDidChangeConfiguration(_ => {
    let hasChanges = false;
    for (const languageId in supportedLanguages) {
      const prev = decoratorEnablement[languageId];
      const curr = isDecoratorEnabled(languageId);
      if (prev !== curr) {
        decoratorEnablement[languageId] = curr;
        hasChanges = true;
      }
    }
    if (hasChanges) {
      updateAllVisibleEditors(true);
    }
  }, null, disposables);

  updateAllVisibleEditors(false);

  function updateAllVisibleEditors(settingsChanges: boolean) {
    window.visibleTextEditors.forEach(editor => {
      if (editor.document) {
        triggerUpdateDecorations(editor.document, settingsChanges);
      }
    });
  }

  function triggerUpdateDecorations(document: TextDocument, settingsChanges = false) {
    const triggerUpdate = supportedLanguages[document.languageId] && (decoratorEnablement[document.languageId] || settingsChanges);
    if (triggerUpdate) {
      const documentUriStr = document.uri.toString();
      const timeout = pendingUpdateRequests[documentUriStr];
      if (typeof timeout !== 'undefined') {
        clearTimeout(timeout);
      }
      pendingUpdateRequests[documentUriStr] = setTimeout(() => {
        // check if the document is in use by an active editor
        for (const editor of window.visibleTextEditors) {
          if (editor.document && documentUriStr === editor.document.uri.toString()) {
            if (decoratorEnablement[editor.document.languageId]) {
              updateDecorationForEditor(documentUriStr, editor.document.version);
              break;
            } else {
              editor.setDecorations(colorsDecorationType, []);
            }
          }
        }
        delete pendingUpdateRequests[documentUriStr];
      }, 500);
    }
  }

  function updateDecorationForEditor(contentUri: string, documentVersion: number) {
    decoratorProvider(contentUri).then(ranges => {
      for (const editor of window.visibleTextEditors) {
        const document = editor.document;

        if (document && document.version === documentVersion && contentUri === document.uri.toString()) {
          const decorations = ranges.slice(0, MAX_DECORATORS).map(range => {
            let color = document.getText(range);
            if (color[0] === '#' && (color.length === 5 || color.length === 9)) {
              const c = fromHex(color);
              if (c) {
                color = `rgba(${c.red}, ${c.green}, ${c.blue}, ${c.alpha})`;
              }
            }
            return <DecorationOptions>{
              range,
              renderOptions: {
                before: {
                  backgroundColor: color
                }
              }
            };
          });
          editor.setDecorations(colorsDecorationType, decorations);
        }
      }
    });
  }

  return Disposable.from(...disposables);
}

function fromHex(hex: string) {
  const length = hex.length;
  if (length === 9) {
    // #RRGGBBAA format
    const red = 16 * _parseHexDigit(hex.charCodeAt(1)) + _parseHexDigit(hex.charCodeAt(2));
    const green = 16 * _parseHexDigit(hex.charCodeAt(3)) + _parseHexDigit(hex.charCodeAt(4));
    const blue = 16 * _parseHexDigit(hex.charCodeAt(5)) + _parseHexDigit(hex.charCodeAt(6));
    const alpha = 16 * _parseHexDigit(hex.charCodeAt(7)) + _parseHexDigit(hex.charCodeAt(8));
    return {
      red, green, blue, alpha
    };
  }
  if (length === 5) {
    // #RGBA format
    const red = _parseHexDigit(hex.charCodeAt(1));
    const green = _parseHexDigit(hex.charCodeAt(2));
    const blue = _parseHexDigit(hex.charCodeAt(3));
    const alpha = _parseHexDigit(hex.charCodeAt(4));
    return {
      red, green, blue, alpha
    };
  }
}

function _parseHexDigit(charCode: number): number {
  // 0 - 9
  if (charCode >= 48 && charCode <= 59) {
    return charCode - 48;
  }
  // a - f
  if (charCode >= 97 && charCode <= 102) {
    return charCode - 87;
  }
  if (charCode >= 65 && charCode <= 70) {
    return charCode - 55;
  }
  return 0;
}
