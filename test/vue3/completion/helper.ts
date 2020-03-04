import * as vscode from 'vscode';
import * as assert from 'assert';
import { showFile } from '../helper';
import { CompletionItem, MarkdownString } from 'vscode';

export interface ExpectedCompletionItem extends CompletionItem {
  documentationStart?: string;
}

export async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedItems: (string | ExpectedCompletionItem)[]
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
        })
      );
    } else {
      const match = result.items.find(i => i.label === ei.label);
      if (!match) {
        assert.fail(`Can't find matching item for ${JSON.stringify(ei, null, 2)}`);
        return;
      }

      assert.ok(match.label, ei.label);
      assert.ok(match.kind, ei.kind as any);

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
          assert.ok(match.documentation.startsWith(ei.documentationStart));
        } else {
          assert.ok((match.documentation as vscode.MarkdownString).value.startsWith(ei.documentationStart));
        }
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
