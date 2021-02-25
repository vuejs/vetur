import { Command } from 'commander';
import { diagnostics } from './commands/diagnostics';

function getVersion(): string {
  const { version }: { version: string } = require('../package.json');
  return `v${version}`;
}

(async () => {
  const program = new Command();
  program.name('vti').description('Vetur Terminal Interface').version(getVersion());

  program
    .command('diagnostics [workspace]')
    .description('Print all diagnostics')
    .action(workspace => {
      diagnostics(workspace);
    });

  program.parse(process.argv);
})().catch(err => {
  console.error(`VTI operation failed with error`);
  console.error(err.stack);
  process.exit(1);
});
