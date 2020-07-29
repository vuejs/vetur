import { CLIEngine, Linter } from 'eslint';
import { configs } from 'eslint-plugin-vue';
import { TextDocument, Diagnostic, Range, DiagnosticSeverity } from 'vscode-languageserver-types';
import { resolve } from 'path';
import { VueVersion } from '../../../services/typescriptService/vueVersion';

function toDiagnostic(error: Linter.LintMessage): Diagnostic {
  const line = error.line - 1;
  const column = error.column - 1;
  const endLine = error.endLine ? error.endLine - 1 : line;
  const endColumn = error.endColumn ? error.endColumn - 1 : column;
  return {
    range: Range.create(line, column, endLine, endColumn),
    message: `\n[${error.ruleId}]\n${error.message}`,
    source: 'eslint-plugin-vue',
    severity: error.severity === 1 ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error
  };
}

export function doESLintValidation(document: TextDocument, engine: CLIEngine): Diagnostic[] {
  const rawText = document.getText();
  // skip checking on empty template
  if (rawText.replace(/\s/g, '') === '') {
    return [];
  }
  const text = rawText.replace(/ {10}/, '<template>') + '</template>';
  const report = engine.executeOnText(text, document.uri);

  return report.results[0] ? report.results[0].messages.map(toDiagnostic) : [];
}

export function createLintEngine(vueVersion: VueVersion) {
  const SERVER_ROOT = resolve(__dirname, '../../../../');

  const basicConfig = {
    useEslintrc: false,
    // So ESLint can find the bundled eslint-plugin-vue
    cwd: SERVER_ROOT,
    ...configs.base
  };

  const versionSpecificConfig = vueVersion === VueVersion.V30 ? configs['vue3-essential'] : configs.essential;

  return new CLIEngine({
    ...basicConfig,
    ...versionSpecificConfig
  });
}
