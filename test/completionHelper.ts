import vscode from 'vscode';
import assert from 'assert';
import { CompletionItem, MarkdownString } from 'vscode';
import { showFile } from './editorHelper';

export interface ExpectedCompletionItem extends CompletionItem {
  /**
   * Documentation has to start with this string
   */
  documentationStart?: string;
  /**
   * Documentation has to include this string
   */
  documentationFragment?: string;
  /**
   * Insertion text edit's string
   */
  insertTextValue?: string;
}

export async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedItems: (string | ExpectedCompletionItem)[],
  matchFn?: (ei: string | ExpectedCompletionItem) => (result: CompletionItem) => boolean
) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  expectedItems.forEach(ei => {
    if (typeof ei === 'string') {
      assert.ok(
        result.items.some(i => {
          return i.label === ei;
        }),
        `Can't find matching item for\n${JSON.stringify(ei, null, 2)}\nSeen items:\n${JSON.stringify(
          result.items,
          null,
          2
        )}`
      );
    } else {
      const match = matchFn ? result.items.find(matchFn(ei)) : result.items.find(i => i.label === ei.label);
      if (!match) {
        assert.fail(
          `Can't find matching item for\n${JSON.stringify(ei, null, 2)}\nSeen items:\n${JSON.stringify(
            result.items,
            null,
            2
          )}`
        );
      }

      assert.equal(match.label, ei.label);
      if (ei.kind) {
        assert.equal(match.kind, ei.kind);
      }
      if (ei.detail) {
        assert.equal(match.detail, ei.detail);
      }

      if (ei.documentation) {
        if (typeof match.documentation === 'string') {
          assert.equal(normalizeNewline(match.documentation), normalizeNewline(ei.documentation as string));
        } else {
          if (ei.documentation && (ei.documentation as MarkdownString).value && match.documentation) {
            assert.equal(
              normalizeNewline((match.documentation as vscode.MarkdownString).value),
              normalizeNewline((ei.documentation as MarkdownString).value)
            );
          }
        }
      }

      if (ei.documentationStart) {
        if (typeof match.documentation === 'string') {
          assert.ok(
            match.documentation.startsWith(ei.documentationStart),
            `${match.documentation}\ndoes not start with\n${ei.documentationStart}`
          );
        } else {
          assert.ok(
            (match.documentation as vscode.MarkdownString).value.startsWith(ei.documentationStart),
            `${(match.documentation as vscode.MarkdownString).value}\ndoes not start with\n${ei.documentationStart}`
          );
        }
      }

      if (ei.documentationFragment) {
        if (typeof match.documentation === 'string') {
          assert.ok(
            match.documentation.includes(ei.documentationFragment),
            `${match.documentation}\ndoes not include\n${ei.documentationFragment}`
          );
        } else {
          assert.ok(
            (match.documentation as vscode.MarkdownString).value.includes(ei.documentationFragment),
            `${(match.documentation as vscode.MarkdownString).value}\ndoes not include\n${ei.documentationFragment}`
          );
        }
      }

      if (ei.insertTextValue) {
        if (match.insertText instanceof vscode.SnippetString) {
          assert.strictEqual(match.insertText.value, ei.insertTextValue);
        } else {
          assert.strictEqual(match.insertText, ei.insertTextValue);
        }
      }
    }
  });
}

export async function testCompletionResolve(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedItems: CompletionItem[],
  itemResolveCount: number,
  matchFn?: (ei: CompletionItem) => (result: CompletionItem) => boolean
) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position,
    undefined,
    itemResolveCount
  )) as vscode.CompletionList;

  expectedItems.forEach(ei => {
    if (typeof ei === 'string') {
      assert.ok(
        result.items.some(i => {
          return i.label === ei;
        }),
        `Can't find matching item for\n${JSON.stringify(ei, null, 2)}\nSeen items:\n${JSON.stringify(
          result.items,
          null,
          2
        )}`
      );
    } else {
      const match = matchFn ? result.items.find(matchFn(ei)) : result.items.find(i => i.label === ei.label);
      if (!match) {
        assert.fail(
          `Can't find matching item for\n${JSON.stringify(ei, null, 2)}\nSeen items:\n${JSON.stringify(
            result.items,
            null,
            2
          )}`
        );
      }

      assert.equal(match.label, ei.label);
      if (ei.kind) {
        assert.equal(match.kind, ei.kind);
      }
      if (ei.detail) {
        assert.equal(match.detail, ei.detail);
      }

      if (ei.documentation) {
        if (typeof match.documentation === 'string') {
          assert.equal(normalizeNewline(match.documentation), normalizeNewline(ei.documentation as string));
        } else {
          if (ei.documentation && (ei.documentation as MarkdownString).value && match.documentation) {
            assert.equal(
              normalizeNewline((match.documentation as vscode.MarkdownString).value),
              normalizeNewline((ei.documentation as MarkdownString).value)
            );
          }
        }
      }

      if (ei.additionalTextEdits) {
        assert.strictEqual(match.additionalTextEdits?.length, ei.additionalTextEdits.length);

        ei.additionalTextEdits.forEach((textEdit, i) => {
          assert.strictEqual(match.additionalTextEdits?.[i].newText, textEdit.newText);
          assert.strictEqual(match.additionalTextEdits?.[i].range.start.line, textEdit.range.start.line);
          assert.strictEqual(match.additionalTextEdits?.[i].range.start.character, textEdit.range.start.character);
          assert.strictEqual(match.additionalTextEdits?.[i].range.end.line, textEdit.range.end.line);
          assert.strictEqual(match.additionalTextEdits?.[i].range.end.character, textEdit.range.end.character);
        });
      }
    }
  });
}

export async function testNoSuchCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  notExpectedItems: (string | ExpectedCompletionItem)[]
) {
  await showFile(docUri);

  const result = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  notExpectedItems.forEach(ei => {
    if (typeof ei === 'string') {
      assert.ok(
        !result.items.some(i => {
          return i.label === ei;
        })
      );
    } else {
      const match = result.items.find(i => {
        for (const x in ei) {
          if (ei[x] !== i[x]) {
            return false;
          }
        }
        return true;
      });

      assert.ok(!match, `Shouldn't find perfect match for ${JSON.stringify(ei, null, 2)}`);
    }
  });
}

function normalizeNewline(input: string) {
  return input.replace(/\r\n/g, '\n');
}
