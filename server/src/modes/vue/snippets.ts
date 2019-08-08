import * as fs from 'fs';
import * as path from 'path';
import { CompletionItem, InsertTextFormat, CompletionItemKind, MarkupContent } from 'vscode-languageserver-types';

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

        return <CompletionItem>{
          label,
          insertText: s.content,
          insertTextFormat: InsertTextFormat.Snippet,
          // Use file icon to indicate file/template/style/script/custom completions
          kind: CompletionItemKind.File,
          documentation: computeDocumentation(s),
          detail: computeDetailsForFileIcon(s),
          sortText: computeSortTextPrefix(s) + label
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

function computeSortTextPrefix(snippet: Snippet) {
  const s = {
    workspace: 0,
    user: 1,
    vetur: 2
  }[snippet.source];

  const t = {
    file: 'a',
    template: 'b',
    style: 'c',
    script: 'd',
    custom: 'e'
  }[snippet.type];

  return s + t;
}

function computeDetailsForFileIcon(s: Snippet) {
  let segments = s.name.split('.');
  if (segments.length >= 2) {
    segments = segments.slice(0, segments.length - 1);
  }
  const nameWithoutSuffix = segments.join('.');

  switch (s.type) {
    case 'file':
      return nameWithoutSuffix + '.vue';
    case 'template':
      return nameWithoutSuffix + '.html';
    case 'style':
      return nameWithoutSuffix + '.css';
    case 'template':
      return nameWithoutSuffix + '.js';
    case 'custom':
      return nameWithoutSuffix;
  }
}

function computeDocumentation(s: Snippet): MarkupContent {
  return {
    kind: 'markdown',
    value: `\`\`\`vue\n${s.content}\n\`\`\``
  };
}
