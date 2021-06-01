import { Command, Option } from 'commander';
import { diagnostics, LogLevel, logLevels } from './commands/diagnostics';

function getVersion(): string {
  const { version }: { version: string } = require('../package.json');
  return `v${version}`;
}

function validateLogLevel(logLevelInput: unknown): logLevelInput is LogLevel {
  return typeof logLevelInput === 'string' && (logLevels as ReadonlyArray<string>).includes(logLevelInput);
}

(async () => {
  const program = new Command();
  program.name('vti').description('Vetur Terminal Interface').version(getVersion());

  program
    .command('diagnostics [workspace] [paths...]')
    .description('Print all diagnostics')
    .addOption(
      new Option('-l, --log-level <logLevel>', 'Log level to print')
        .default('WARN')
        // logLevels is readonly array but .choices need read-write array (because of weak typing)
        .choices((logLevels as unknown) as string[])
    )
    .action(async (workspace, paths, options) => {
      const logLevelOption: unknown = options.logLevel;
      if (!validateLogLevel(logLevelOption)) {
        throw new Error(`Invalid log level: ${logLevelOption}`);
      }
      await diagnostics(workspace, paths, logLevelOption);
    });

  program.parse(process.argv);
})().catch(err => {
  console.error(`VTI operation failed with error`);
  console.error(err.stack);
  process.exit(1);
});
