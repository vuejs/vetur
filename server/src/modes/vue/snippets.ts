import * as fs from 'fs';
import * as path from 'path';
import { CompletionItem, InsertTextFormat, CompletionItemKind } from 'vscode-languageserver-types';

type SnippetSource = 'workspace' | 'user' | 'vetur';
type SnippetType = 'file' | 'template' | 'style' | 'script' | 'custom';
interface Snippet {
  source: SnippetSource;
  name: string;
  type: SnippetType;
  content: string;
}

export interface ScaffoldSnippetSources {
  workspace: string | undefined;
  user: string | undefined;
  vetur: string | undefined;
}

export class SnippetManager {
  private _snippets: Snippet[] = [];

  constructor(workspacePath: string, globalSnippetDir: string) {
    this._snippets = [
      ...loadAllSnippets(path.resolve(workspacePath, '.vscode/vetur/snippets'), 'workspace'),
      ...loadAllSnippets(globalSnippetDir, 'user'),
      ...loadAllSnippets(path.resolve(__dirname, './veturSnippets'), 'vetur')
    ];
  }

  // Return all snippets in order
  completeSnippets(scaffoldSnippetSources: ScaffoldSnippetSources): CompletionItem[] {
    return this._snippets
      .filter(s => {
        return scaffoldSnippetSources[s.source] !== '';
      })
      .map(s => {
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

        const sourceIndicator = scaffoldSnippetSources[s.source];

        const label = `${scaffoldLabelPre} ${s.name} ${sourceIndicator}`;
        const sortText = computeSortTextPrefix(s.source, s.type) + label;
        const detail = computeDetailsForFileIcon(s.name, s.type);
        return <CompletionItem>{
          label,
          insertText: s.content,
          insertTextFormat: InsertTextFormat.Snippet,
          // Use file icon to indicate file/template/style/script/custom completions
          kind: CompletionItemKind.File,
          detail,
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

function computeDetailsForFileIcon(name: string, type: SnippetType) {
  switch (type) {
    case 'file':
      return name + '.vue';
    case 'template':
      return name + '.html';
    case 'style':
      return name + '.css';
    case 'template':
      return name + '.js';
    case 'custom':
      return name;
  }
}