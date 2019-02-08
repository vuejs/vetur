const glob = require('glob');
const jsYaml = require('js-yaml')
const fs = require('fs')
const path = require('path')

glob(__dirname + '/syntaxes/*.yaml', {nocase: true}, (err, files) => {

  for (const file of files) {
    const pathData = path.parse(file)
    fs.writeFileSync(pathData.dir + '/' + pathData.name + '.tmLanguage.json', JSON.stringify(jsYaml.safeLoad(fs.readFileSync(file))))
  }
  console.log('built files', files)
})
