import lex, { Loc } from 'pug-lexer';
import { Position, Range } from 'vscode-languageserver-types';

export function findTokenAtPosition(code: string, position: Position): lex.Token | null {
  const tokens = lex(code);

  const oneBasedPos = Position.create(position.line + 1, position.character + 1);

  return (
    tokens.find(
      ({ loc, type }) =>
        loc.start.line <= oneBasedPos.line &&
        loc.end.line >= oneBasedPos.line &&
        loc.start.column <= oneBasedPos.character &&
        loc.end.column > oneBasedPos.character &&
        type !== 'newline'
    ) || null
  );
}

export const locToRange = (loc: Loc): Range => ({
  start: Position.create(loc.start.line - 1, loc.start.column - 1),
  end: Position.create(loc.end.line - 1, loc.end.column - 1)
});
