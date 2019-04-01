import {
  IConnection,
  TextDocument,
  Emitter,
  TextDocumentChangeEvent,
  TextDocumentWillSaveEvent,
  RequestHandler,
  TextEdit,
  Event,
  TextDocumentContentChangeEvent,
  Position,
  Range
} from 'vscode-languageserver';
import { getRegions, createDocumentRegions } from '../modes/embeddedSupport';
import { TextChangeRange, createTextChangeRange, createTextSpanFromBounds } from 'typescript';
import { mergeSort } from '../utils/mergeSort';

/**
 * Service responsible for managing documents being syned through LSP
 */

/**
 * A manager for simple text documents
 */
export class DocumentService {
  private _infos: { [uri: string]: VueDocumentInfo };

  private _onDidChangeContent: Emitter<TextDocumentChangeEvent>;
  private _onDidOpen: Emitter<TextDocumentChangeEvent>;
  private _onDidClose: Emitter<TextDocumentChangeEvent>;
  private _onDidSave: Emitter<TextDocumentChangeEvent>;
  private _onWillSave: Emitter<TextDocumentWillSaveEvent>;
  private _willSaveWaitUntil: RequestHandler<TextDocumentWillSaveEvent, TextEdit[], void> | undefined;

  /**
   * Create a new text document manager.
   */
  public constructor() {
    this._infos = Object.create(null);
    this._onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
    this._onDidOpen = new Emitter<TextDocumentChangeEvent>();
    this._onDidClose = new Emitter<TextDocumentChangeEvent>();
    this._onDidSave = new Emitter<TextDocumentChangeEvent>();
    this._onWillSave = new Emitter<TextDocumentWillSaveEvent>();
  }

  /**
   * An event that fires when a text document managed by this manager
   * has been opened or the content changes.
   */
  public get onDidChangeContent(): Event<TextDocumentChangeEvent> {
    return this._onDidChangeContent.event;
  }

  /**
   * An event that fires when a text document managed by this manager
   * has been opened.
   */
  public get onDidOpen(): Event<TextDocumentChangeEvent> {
    return this._onDidOpen.event;
  }

  /**
   * An event that fires when a text document managed by this manager
   * will be saved.
   */
  public get onWillSave(): Event<TextDocumentWillSaveEvent> {
    return this._onWillSave.event;
  }

  /**
   * Sets a handler that will be called if a participant wants to provide
   * edits during a text document save.
   */
  public onWillSaveWaitUntil(handler: RequestHandler<TextDocumentWillSaveEvent, TextEdit[], void>) {
    this._willSaveWaitUntil = handler;
  }

  /**
   * An event that fires when a text document managed by this manager
   * has been saved.
   */
  public get onDidSave(): Event<TextDocumentChangeEvent> {
    return this._onDidSave.event;
  }

  /**
   * An event that fires when a text document managed by this manager
   * has been closed.
   */
  public get onDidClose(): Event<TextDocumentChangeEvent> {
    return this._onDidClose.event;
  }

  /**
   * Returns all text documents managed by this instance.
   *
   * @return all text documents.
   */
  public getAllDocuments() {
    return Object.keys(this._infos).map(x => this._infos[x]);
  }

  public getAllDocumentInfos() {
    return Object.keys(this._infos).map(x => this._infos[x]);
  }

  /**
   * Returns the document for the given URI. Returns undefined if
   * the document is not mananged by this instance.
   *
   * @param uri The text document's URI to retrieve.
   * @return the text document or `undefined`.
   */
  public getDocument(uriOrDocument: string | TextDocument): TextDocument | undefined {
    if (typeof uriOrDocument === 'object') {
      uriOrDocument = uriOrDocument.uri;
    }
    return this._infos[uriOrDocument];
  }

  public getDocumentInfo(uriOrDocument: string | TextDocument): VueDocumentInfo | undefined {
    if (typeof uriOrDocument === 'object') {
      uriOrDocument = uriOrDocument.uri;
    }
    return this._infos[uriOrDocument];
  }

  /**
   * Returns the URIs of all text documents managed by this instance.
   *
   * @return the URI's of all text documents.
   */
  public keys(): string[] {
    return Object.keys(this._infos);
  }

  /**
   * Listens for `low level` notification on the given connection to
   * update the text documents managed by this instance.
   *
   * @param connection The connection to listen on.
   */
  public listen(connection: IConnection): void {
    connection.onDidOpenTextDocument(event => {
      const td = event.textDocument;
      const document = TextDocument.create(td.uri, td.languageId, td.version, td.text);
      this._infos[td.uri] = new VueDocumentInfo(document);
      const toFire = Object.freeze({ document });
      this._onDidOpen.fire(toFire);
      this._onDidChangeContent.fire(toFire);
    });
    connection.onDidChangeTextDocument(event => {
      const td = event.textDocument;
      const changes = event.contentChanges;
      const document = this._infos[td.uri];

      if (changes.length === 1 && !changes[0].range) {
        document.updateContent(changes[0].text, td.version!);
      } else {
        document.editContent(changes.map(({ range, text }) => ({ range: range!, newText: text })), td.version!);
      }
      const toFire = Object.freeze({ document });
      this._onDidChangeContent.fire(toFire);
    });
    connection.onDidCloseTextDocument(event => {
      const document = this._infos[event.textDocument.uri];
      if (document) {
        delete this._infos[event.textDocument.uri];
        this._onDidClose.fire(Object.freeze({ document }));
      }
    });
    connection.onWillSaveTextDocument(event => {
      const document = this._infos[event.textDocument.uri];
      if (document) {
        this._onWillSave.fire(Object.freeze({ document, reason: event.reason }));
      }
    });
    connection.onWillSaveTextDocumentWaitUntil((event, token) => {
      const document = this._infos[event.textDocument.uri];
      if (document && this._willSaveWaitUntil) {
        return this._willSaveWaitUntil(Object.freeze({ document, reason: event.reason }), token);
      } else {
        return [];
      }
    });
    connection.onDidSaveTextDocument(event => {
      const td = event.textDocument;
      const document = this._infos[event.textDocument.uri];
      if (document) {
        if (isUpdateableDocument(document)) {
          if (td.version === null || td.version === void 0) {
            throw new Error(`Received document change event for ${td.uri} without valid version identifier`);
          }
          document.update({ text: event.text! }, td.version);
          this._onDidChangeContent.fire(Object.freeze({ document }));
        }
        this._onDidSave.fire(Object.freeze({ document }));
      }
    });
  }
}

interface UpdateableDocument extends TextDocument {
  update(event: TextDocumentContentChangeEvent, version: number): void;
}

function isUpdateableDocument(value: TextDocument): value is UpdateableDocument {
  return typeof (value as UpdateableDocument).update === 'function';
}

export abstract class DocumentInfoBase implements TextDocument {
  protected readonly _originalDocument: TextDocument;
  protected readonly _updatedDocument: TextDocument;

  constructor(originalDocument: TextDocument, public editRanges: TextEdit[] = []) {
    this._originalDocument = originalDocument;
    this._updatedDocument = TextDocument.create(
      originalDocument.uri,
      originalDocument.languageId,
      originalDocument.version,
      originalDocument.getText()
    );
  }

  public get version() {
    return this._updatedDocument.version;
  }
  public get uri() {
    return this._updatedDocument.uri;
  }
  public get languageId() {
    return this._updatedDocument.languageId;
  }

  public getText(range?: Range) {
    return this._updatedDocument.getText(range);
  }
  public positionAt(offset: number) {
    return this._updatedDocument.positionAt(offset);
  }
  public offsetAt(position: Position) {
    return this._updatedDocument.offsetAt(position);
  }
  public get lineCount() {
    return this._updatedDocument.lineCount;
  }

  public updateContent(content: string, version?: number): void {
    this.editRanges = [];
    if (isUpdateableDocument(this._originalDocument)) {
      this._originalDocument.update({ text: content }, version || this.version + 1);
    }
    if (isUpdateableDocument(this._updatedDocument)) {
      this._updatedDocument.update({ text: content }, version || this.version + 1);
    }
  }

  public editContent(edits: TextEdit[], version?: number): void {
    edits = mergeSort(edits, function(a, b) {
      const diff = a.range.start.line - b.range.start.line;
      if (diff === 0) {
        return a.range.start.character - b.range.start.character;
      }
      return diff;
    });
    const updatedText = TextDocument.applyEdits(this._updatedDocument, edits);
    this.editRanges.push(...edits);
    if (isUpdateableDocument(this._updatedDocument)) {
      this._updatedDocument.update({ text: updatedText }, version || this.version + 1);
    }
  }
}

export class VueDocumentInfo extends DocumentInfoBase {
  private _regions: ReturnType<typeof buildRegions> | null = null;

  constructor(originalDocument: TextDocument, public editRanges: TextEdit[] = []) {
    super(originalDocument, editRanges);
  }

  public get regions() {
    // getRegions(this.document)
    if (!this._regions) {
      this._regions = buildRegions(this._updatedDocument, this.editRanges);
    }
    return this._regions;
  }

  public updateContent(content: string, version?: number): void {
    this._regions = null;
    super.updateContent(content, version);
  }

  public editContent(edits: TextEdit[], version?: number): void {
    this._regions = null;
    super.editContent(edits, version);
  }
}

const defaultType: { [type: string]: string } = {
  template: 'vue-html',
  script: 'javascript',
  style: 'css'
};

function buildRegions(document: TextDocument, textEdits: TextEdit[]) {
  const documentInfos: { [languageId: string]: DocumentRegion } = {};
  const documentInfosByType: { [type: string]: DocumentRegion } = {};
  const { regions, importedScripts } = getRegions(document);
  for (const region of regions) {
    let content = document
      .getText()
      .substring(0, region.start)
      .replace(/./g, ' ');
    content += document.getText().substring(region.start, region.end);

    // TODO: This might need to progressively rebuild the region to track html changes
    const edits: TextChangeRange[] = [];
    for (const edit of textEdits) {
      if (document.offsetAt(edit.range.start) > region.end || document.offsetAt(edit.range.end) < region.start) {
        continue;
      }
      let startOffset = document.offsetAt(edit.range.start) - 1;
      startOffset = Math.max(startOffset, 0);
      let endOffset = document.offsetAt(edit.range.end);
      endOffset = Math.min(endOffset, region.end);
      edits.push(createTextChangeRange(createTextSpanFromBounds(startOffset, endOffset), edit.newText.length + 2));
    }

    documentInfosByType[region.type] = documentInfos[region.languageId] = new DocumentRegion(
      TextDocument.create(document.uri, region.languageId, document.version, content),
      edits
    );
  }

  const documentRegions = createDocumentRegions(document, regions, importedScripts);
  return {
    ...documentRegions,
    getEmbeddedDocument: (languageId: string) =>
      (documentInfos[languageId] && documentInfos[languageId].document) ||
      TextDocument.create(document.uri, languageId, document.version, ''),
    getEmbeddedDocumentByType: (type: 'template' | 'script' | 'style' | 'custom') =>
      (documentInfosByType[type] && documentInfosByType[type].document) ||
      TextDocument.create(document.uri, defaultType[type], document.version, ''),
    getEmbeddedDocumentInfo: (languageId: string) =>
      documentInfos[languageId] ||
      new DocumentRegion(TextDocument.create(document.uri, languageId, document.version, ''), []),
    getEmbeddedDocumentInfoByType: (type: 'template' | 'script' | 'style' | 'custom') =>
      documentInfosByType[type] ||
      new DocumentRegion(TextDocument.create(document.uri, defaultType[type], document.version, ''), [])
  };
  // return { documentInfos, importedScripts };
}

export class DocumentRegion {
  constructor(public document: TextDocument, public editRanges: TextChangeRange[] = []) {}

  public get version() {
    return this.document.version;
  }
  public get uri() {
    return this.document.uri;
  }
  public get languageId() {
    return this.document.languageId;
  }
}
