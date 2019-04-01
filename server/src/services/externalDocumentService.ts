import { IConnection, TextDocument, Emitter, TextDocumentChangeEvent, Event } from 'vscode-languageserver';
import { sys, Extension } from 'typescript';
import { isVue } from '../modes/script/preprocess';
import Uri from 'vscode-uri';
import { extname } from 'path';
import { VueDocumentInfo, DocumentInfoBase } from './documentService';

/**
 * Service responsible for managing documents being syned through LSP
 */

/**
 * A manager for simple text documents
 */
export class ExternalDocumentService {
  private _infos: { [uri: string]: ExternalDocumentInfo | VueDocumentInfo };

  private _onDidChangeContent: Emitter<TextDocumentChangeEvent>;

  /**
   * Create a new text document manager.
   */
  public constructor() {
    this._infos = Object.create(null);
    this._onDidChangeContent = new Emitter<TextDocumentChangeEvent>();
  }

  /**
   * An event that fires when a text document managed by this manager
   * has been opened or the content changes.
   */
  public get onDidChangeContent(): Event<TextDocumentChangeEvent> {
    return this._onDidChangeContent.event;
  }

  /**
   * Returns all text documents managed by this instance.
   *
   * @return all text documents.
   */
  public getAllDocuments() {
    return Object.keys(this._infos).map(x => this._infos[x]);
  }

  /**
   * Returns the document for the given URI. Returns undefined if
   * the document is not mananged by this instance.
   *
   * @param uri The text document's URI to retrieve.
   * @return the text document or `undefined`.
   */
  public getDocument(uriOrDocument: string | TextDocument): ExternalDocumentInfo | undefined {
    if (typeof uriOrDocument === 'object') {
      uriOrDocument = uriOrDocument.uri;
    }
    return this._infos[uriOrDocument];
  }

  public getOrLoadDocument(uri: Uri) {
    const uriStr = uri.toString();
    const existingInfo = this._infos[uriStr];
    const filePath = uri.fsPath;
    const content = sys.readFile(filePath)!;
    if (!existingInfo) {
      if (isVue(uriStr)) {
        this._infos[uriStr] = new VueDocumentInfo(TextDocument.create(uriStr, 'vue', 0, content));
      } else {
        this._infos[uriStr] = new ExternalDocumentInfo(
          TextDocument.create(uriStr, getLanguageId(filePath), 0, content)
        );
      }
      return this._infos[uriStr];
    }
    return existingInfo;
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
    connection.onDidChangeWatchedFiles(event => {
      for (const { uri } of event.changes) {
        const existingInfo = this._infos[uri];
        const filePath = getNormalizedFileFsPath(uri);
        const content = sys.readFile(filePath)!;
        if (!existingInfo) {
          if (isVue(uri)) {
            this._infos[uri] = new VueDocumentInfo(TextDocument.create(uri, 'vue', 0, content));
          } else {
            this._infos[uri] = new ExternalDocumentInfo(TextDocument.create(uri, getLanguageId(filePath), 0, content));
          }
        } else {
          this._infos[uri].updateContent(content);
        }
        const toFire = Object.freeze({ document: this._infos[uri] });
        this._onDidChangeContent.fire(toFire);
      }
    });
  }
}

export class ExternalDocumentInfo extends DocumentInfoBase {}

function getNormalizedFileFsPath(fileName: string): string {
  return Uri.parse(fileName).fsPath;
}

function getLanguageId(fileName: string): string {
  const ext = extname(fileName);
  switch (ext) {
    case Extension.Ts:
      return 'typescript';
    case Extension.Tsx:
      return 'tsx';
    case Extension.Dts:
      return 'typescript';
    case Extension.Json:
      return 'json';
    case Extension.Js:
      return 'javascript';
    case Extension.Jsx:
      return 'jsx';
  }
  return 'unknown';
}
