cp README.md CHANGELOG.md ./docs/

cd docs
rm -rf _book
gitbook install
gitbook build
cd _book
git init
git add -A
git commit -m 'update book'
git push -f git@github.com:octref/vetur.git master:gh-pages

cd ..
rm ./CHANGELOG.md ./README.md