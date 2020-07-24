const rimraf = require('rimraf');
const { ncp } = require('ncp');
const { ensureDirSync } = require('fs-extra');

const PDIR = 'server/dist/modes/vue';
const DIR = 'server/dist/modes/vue/veturSnippets';

// Create parent dir and ensure clean snippet dir
ensureDirSync(PDIR);
rimraf.sync(DIR);

ncp('server/src/modes/vue/veturSnippets', 'server/dist/modes/vue/veturSnippets');
