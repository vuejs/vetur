const rimraf = require('rimraf');
const { resolve } = require('path');
const { ncp } = require('ncp');
const { ensureDirSync } = require('fs-extra');

const PDIR = 'server/dist/modes/vue';
const DIR = 'server/dist/modes/vue/veturSnippets';

ensureDirSync(PDIR);
rimraf.sync(DIR);

ncp('server/src/modes/vue/veturSnippets', 'server/dist/modes/vue/veturSnippets');
