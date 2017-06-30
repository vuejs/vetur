cd docs
rm -rf _book
gitbook install
gitbook build
cd _book
git init
git add -A
git commit -m 'update book'
git push -f git@github.com:vuejs/vetur.git master:gh-pages