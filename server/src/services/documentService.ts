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
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  WillSaveTextDocumentParams,
  CancellationToken,
  DidSaveTextDocumentParams,
  Position,
  Range
} from 'vscode-languageserver';
import { getRegions, createDocumentRegions } from '../modes/embeddedSupport';
import { TextChangeRange, createTextChangeRange, createTextSpanFromBounds } from 'typescript';

/**
 * Service responsible for managing documents being syned through LSP
 */

/**
 * A manager for simple text documents
 */
export class DocumentService {
  private _infos: { [uri: string]: DocumentInfo };

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

  public getAllDocumentInfos(uri: string) {
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

  public getDocumentInfo(uriOrDocument: string | TextDocument): DocumentInfo | undefined {
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
    connection.onDidOpenTextDocument((event: DidOpenTextDocumentParams) => {
      const td = event.textDocument;
      const document = TextDocument.create(td.uri, td.languageId, td.version, td.text);
      this._infos[td.uri] = new DocumentInfo(document);
      const toFire = Object.freeze({ document });
      this._onDidOpen.fire(toFire);
      this._onDidChangeContent.fire(toFire);
    });
    connection.onDidChangeTextDocument((event: DidChangeTextDocumentParams) => {
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
    connection.onDidCloseTextDocument((event: DidCloseTextDocumentParams) => {
      const document = this._infos[event.textDocument.uri];
      if (document) {
        delete this._infos[event.textDocument.uri];
        this._onDidClose.fire(Object.freeze({ document }));
      }
    });
    connection.onWillSaveTextDocument((event: WillSaveTextDocumentParams) => {
      const document = this._infos[event.textDocument.uri];
      if (document) {
        this._onWillSave.fire(Object.freeze({ document, reason: event.reason }));
      }
    });
    connection.onWillSaveTextDocumentWaitUntil((event: WillSaveTextDocumentParams, token: CancellationToken) => {
      const document = this._infos[event.textDocument.uri];
      if (document && this._willSaveWaitUntil) {
        return this._willSaveWaitUntil(Object.freeze({ document, reason: event.reason }), token);
      } else {
        return [];
      }
    });
    connection.onDidSaveTextDocument((event: DidSaveTextDocumentParams) => {
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

export class DocumentInfo implements TextDocument {
  private _regions: ReturnType<typeof buildRegions> | null = null;
  private _originalDocument: TextDocument;
  private _updatedDocument: TextDocument;

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
  public get regions() {
    // getRegions(this.document)
    if (!this._regions) {
      this._regions = buildRegions(this._updatedDocument, this.editRanges);
    }
    return this._regions;
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

  public updateContent(content: string, version: number): void {
    this.editRanges = [];
    this._regions = null;
    if (isUpdateableDocument(this._originalDocument)) {
      this._originalDocument.update({ text: content }, version);
    }
    if (isUpdateableDocument(this._updatedDocument)) {
      this._updatedDocument.update({ text: content }, version);
    }
  }

  public editContent(edits: TextEdit[], version: number): void {
    this._regions = null;
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
      this._updatedDocument.update({ text: updatedText }, version);
    }
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
      let editStart = document.offsetAt(edit.range.start);
      let editEnd = document.offsetAt(edit.range.end);
      if (editStart > region.end || editEnd < region.start) {
        continue;
      }
      edits.push(
        createTextChangeRange(
          createTextSpanFromBounds(document.offsetAt(edit.range.start), document.offsetAt(edit.range.end)),
          edit.newText.length
        )
      );
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

function mergeSort(data: TextEdit[], compare: (a: TextEdit, b: TextEdit) => number) {
  if (data.length <= 1) {
    // sorted
    return data;
  }
  const p = (data.length / 2) | 0;
  const left = data.slice(0, p);
  const right = data.slice(p);
  mergeSort(left, compare);
  mergeSort(right, compare);
  let leftIdx = 0;
  let rightIdx = 0;
  let i = 0;
  while (leftIdx < left.length && rightIdx < right.length) {
    const ret = compare(left[leftIdx], right[rightIdx]);
    if (ret <= 0) {
      // smaller_equal -> take left to preserve order
      data[i++] = left[leftIdx++];
    } else {
      // greater -> take right
      data[i++] = right[rightIdx++];
    }
  }
  while (leftIdx < left.length) {
    data[i++] = left[leftIdx++];
  }
  while (rightIdx < right.length) {
    data[i++] = right[rightIdx++];
  }
  return data;
}
