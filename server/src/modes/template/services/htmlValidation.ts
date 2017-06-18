import { CLIEngine } from 'eslint';
import { configs } from 'eslint-plugin-vue';
import { TextDocument, Diagnostic, Range, DiagnosticSeverity } from 'vscode-languageserver-types';

export function doValidation(document: TextDocument, engine: CLIEngine): Diagnostic[] {
  const text = document.getText()
    .replace(/^\s{10}/, '<template>')
    .replace(/\s{11}$/, '</template>');
  const report = engine.executeOnText(text, document.uri);
  return report.results[0].messages.map(ret => ({
    range: Range.create(ret.line - 1, ret.column - 1, ret.endLine - 1, ret.endColumn - 1),
    message: ret.message,
    source: 'vue-language-server',
    severity: ret.severity === 1 ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error
  }));
}

export function createLintEngine() {
  return new CLIEngine({
    useEslintrc: false,
    ...configs.base,
    ...configs.recommended
  });
}
