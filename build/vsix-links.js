/**
 * Include VSIX Links in Changelog.md
 */

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.resolve(__dirname, '../CHANGELOG.md');
const DOCS_CHANGELOG_PATH = path.resolve(__dirname, '../docs/CHANGELOG.md');

const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf-8');

const newChangelog = changelog.replace(/### ([0-9.]+) \| ([0-9-]+)\n/g, (match, ver, date) => {
  const publisher = 'octref';
  const extname = 'vetur';
  const link = `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/${publisher}/vsextensions/${extname}/${ver}/vspackage`;

  return `### ${ver} | ${date} | [VSIX](${link})\n`;
});

fs.writeFileSync(CHANGELOG_PATH, newChangelog);
fs.writeFileSync(DOCS_CHANGELOG_PATH, newChangelog);
