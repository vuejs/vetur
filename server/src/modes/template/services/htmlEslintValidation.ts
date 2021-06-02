import { ESLint, Linter } from 'eslint';
import { configs } from 'eslint-plugin-vue';
import { Diagnostic, Range, DiagnosticSeverity } from 'vscode-languageserver-types';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import { resolve } from 'path';
import { VueVersion } from '../../../utils/vueVersion';

function toDiagnostic(error: Linter.LintMessage): Diagnostic {
  const line = error.line - 1;
  const column = error.column - 1;
  const endLine = error.endLine ? error.endLine - 1 : line;
  const endColumn = error.endColumn ? error.endColumn - 1 : column;
  return {
    range: Range.create(line, column, endLine, endColumn),
    message: `[${error.ruleId}]\n${error.message}`,
    source: 'eslint-plugin-vue',
    severity: error.severity === 1 ? DiagnosticSeverity.Warning : DiagnosticSeverity.Error
  };
}

export async function doESLintValidation(document: TextDocument, engine: ESLint): Promise<Diagnostic[]> {
  const rawText = document.getText();
  // skip checking on empty template
  if (rawText.replace(/\s/g, '') === '') {
    return [];
  }
  const text = rawText.replace(/ {10}/, '<template>') + '</template>';
  const report = await engine.lintText(text, { filePath: document.uri });

  return report?.[0]?.messages?.map(toDiagnostic) ?? [];
}

export function createLintEngine(vueVersion: VueVersion) {
  const SERVER_ROOT = __dirname;

  const versionSpecificConfig: Linter.Config =
    vueVersion === VueVersion.V30 ? configs['vue3-essential'] : configs.essential;
  if (vueVersion === VueVersion.V30) {
    versionSpecificConfig.parserOptions = {
      ...versionSpecificConfig.parserOptions,
      vueFeatures: {
        ...versionSpecificConfig.parserOptions?.vueFeatures,
        interpolationAsNonHTML: true
      }
    };
  }

  const baseConfig: Linter.Config = configs.base;
  baseConfig.ignorePatterns = ['!.*'];

  return new ESLint({
    useEslintrc: false,
    cwd: SERVER_ROOT,
    baseConfig,
    overrideConfig: versionSpecificConfig
  });
}
