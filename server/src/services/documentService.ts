import { Connection, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Service responsible for managing documents being syned through LSP
 * Todo - Switch to incremental sync
 */
export class DocumentService {
  private documents: TextDocuments<TextDocument>;

  constructor(conn: Connection) {
    this.documents = new TextDocuments(TextDocument);
    this.documents.listen(conn);
  }

  getDocument(uri: string) {
    return this.documents.get(uri);
  }

  getAllDocuments() {
    return this.documents.all();
  }

  get onDidChangeContent() {
    return this.documents.onDidChangeContent;
  }
  get onDidClose() {
    return this.documents.onDidClose;
  }
}
