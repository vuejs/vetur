import * as fs from 'fs';
import * as path from 'path';
import { CompletionItem, InsertTextFormat, CompletionItemKind } from 'vscode-languageserver-types';

type SnippetSource = 'user' | 'workspace' | 'vetur';
type SnippetType = 'file' | 'template' | 'style' | 'script' | 'custom';
interface Snippet {
  source: SnippetSource;
  name: string;
  type: SnippetType;
  content: string;
}

export class SnippetManager {
  private _snippets: Snippet[] = [];

  constructor(workspacePath: string, globalSnippetDir: string | undefined) {
    if (globalSnippetDir && fs.existsSync(globalSnippetDir)) {
      this._snippets = [
        ...loadAllSnippets(path.resolve(workspacePath, '.vscode/vetur/snippets'), 'workspace'),
        ...loadAllSnippets(globalSnippetDir, 'user'),
        ...loadAllSnippets(path.resolve(__dirname, '../../../../server/src/modes/vue/veturSnippets'), 'vetur')
      ];
    }
  }

  // Return all snippets in order
  completeSnippets(): CompletionItem[] {
    return this._snippets.map(s => {
      let scaffoldLabelPre = '';
      switch (s.type) {
        case 'file':
          scaffoldLabelPre = '<file> with';
          break;
        case 'custom':
          scaffoldLabelPre = '<custom> with';
          break;
        case 'template':
        case 'style':
        case 'script':
          scaffoldLabelPre = `<${s.type}>`;
          break;
      }

      const shortUpperSource = s.source[0].toUpperCase();

      const label = `${scaffoldLabelPre} ${s.name} (${shortUpperSource})`;
      const sortText = computeSortTextPrefix(s.source, s.type) + label;
      return <CompletionItem>{
        label,
        kind: CompletionItemKind.Snippet,
        insertText: s.content,
        insertTextFormat: InsertTextFormat.Snippet,
        sortText
      };
    });
  }
}

function loadAllSnippets(rootDir: string, source: SnippetSource): Snippet[] {
  return [
    ...loadSnippetsFromDir(rootDir, source, 'file'),
    ...loadSnippetsFromDir(path.resolve(rootDir, 'template'), source, 'template'),
    ...loadSnippetsFromDir(path.resolve(rootDir, 'style'), source, 'style'),
    ...loadSnippetsFromDir(path.resolve(rootDir, 'script'), source, 'script'),
    ...loadSnippetsFromDir(path.resolve(rootDir, 'custom'), source, 'custom')
  ];
}

function loadSnippetsFromDir(dir: string, source: SnippetSource, type: SnippetType): Snippet[] {
  const snippets: Snippet[] = [];

  if (!fs.existsSync(dir)) {
    return snippets;
  }

  try {
    fs.readdirSync(dir)
      .filter(p => p.endsWith('.vue'))
      .forEach(p => {
        snippets.push({
          source,
          name: p,
          type,
          content: fs.readFileSync(path.resolve(dir, p), 'utf-8').replace(/\\t/g, '\t')
        });
      });
  } catch (err) {}

  return snippets;
}

function computeSortTextPrefix(source: SnippetSource, type: SnippetType) {
  const s = {
    workspace: 0,
    user: 1,
    vetur: 2
  }[source];

  const t = {
    file: 'a',
    template: 'b',
    style: 'c',
    script: 'd',
    custom: 'e'
  }[type];

  return s + t;
}
