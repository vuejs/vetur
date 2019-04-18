import { IConnection, TextDocument, Emitter, Event } from 'vscode-languageserver';
import { sys, Extension, IScriptSnapshot, TextChangeRange, unchangedTextChangeRange } from 'typescript';
import { isVue, parseVueScript } from '../modes/script/preprocess';
import Uri from 'vscode-uri';
import { extname } from 'path';

/**
 * Service responsible for managing documents being syned through LSP
 */

/**
 * A manager for simple text documents
 */
export class ExternalDocumentService {
  private _infos: { [uri: string]: ExternalDocumentInfo };

  private _onDidChangeContent: Emitter<{ document: ExternalDocumentInfo }>;

  /**
   * Create a new text document manager.
   */
  public constructor(conn: IConnection) {
    this._infos = Object.create(null);
    this._onDidChangeContent = new Emitter<{ document: ExternalDocumentInfo }>();

    this.listen(conn);
  }

  /**
   * An event that fires when a text document managed by this manager
   * has been opened or the content changes.
   */
  public get onDidChangeContent(): Event<{ document: ExternalDocumentInfo }> {
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
    if (!existingInfo) {
      this._infos[uriStr] = new ExternalDocumentInfo(uriStr, getLanguageId(filePath));
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
  private listen(connection: IConnection): void {
    connection.onDidChangeWatchedFiles(event => {
      for (const { uri } of event.changes) {
        const existingInfo = this._infos[uri];
        const filePath = getNormalizedFileFsPath(uri);
        if (!existingInfo) {
          this._infos[uri] = new ExternalDocumentInfo(uri, getLanguageId(filePath));
        } else {
          this._infos[uri].changeContent();
        }
        const toFire = Object.freeze({ document: this._infos[uri] });
        this._onDidChangeContent.fire(toFire);
      }
    });
  }
}

export class ExternalDocumentInfo {
  private _version = 0;
  private _snapshot: IScriptSnapshot | null = null;
  public readonly uri: string;
  public readonly languageId: string;
  constructor(uri: string, languageId: string) {
    this.uri = uri;
    this.languageId = languageId;
  }

  public get version() {
    return this._version;
  }

  public getText() {
    const filePath = getNormalizedFileFsPath(this.uri);
    const content = sys.readFile(filePath)!;
    if (isVue(this.uri)) {
      return parseVueScript(content);
    }
    return content;
  }

  public changeContent(version?: number): void {
    this._version = version || this.version + 1;
    this._snapshot = null;
  }

  public get snapshot() {
    if (this._snapshot === null) {
      this._snapshot = new DocumentSnapshot(this);
    }
    return this._snapshot;
  }
}

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

class DocumentSnapshot implements IScriptSnapshot {
  public textSnapshot: string;
  public version: number;

  constructor(documentInfo: ExternalDocumentInfo) {
    this.textSnapshot = documentInfo.getText() || '';
    this.version = documentInfo.version;
  }

  public getText(start: number, end: number): string {
    return this.textSnapshot.substring(start, end);
  }

  public getLength(): number {
    return this.textSnapshot.length;
  }

  public getChangeRange(oldScript: IScriptSnapshot): TextChangeRange | undefined {
    const oldShim = <DocumentSnapshot>oldScript;
    return this.getTextChangeRange(oldShim);
  }

  public getTextChangeRange(oldVersion: DocumentSnapshot): TextChangeRange {
    if (this.version === oldVersion.version) {
      // No edits!
      return unchangedTextChangeRange;
    }

    // TODO: Try to create the correct change text range, that doesn't break things.
    return undefined as any;
    // if (oldVersion.documentInfo.editRanges.length > 0) {
    //   return ts.collapseTextChangeRangesAcrossMultipleVersions(
    //     this.documentInfo.editRanges.slice(
    //       oldVersion.documentInfo.editRanges.length - 1,
    //       this.documentInfo.editRanges.length - 1
    //     )
    //   );
    // } else if (oldVersion.documentInfo.editRanges.length > this.documentInfo.editRanges.length) {
    //   return undefined;
    // }
    // return ts.collapseTextChangeRangesAcrossMultipleVersions(this.documentInfo.editRanges);
  }
}
