cd docs
rm -rf _book
gitbook install -v 3.2.2
gitbook build -v 3.2.2
cd _book
git init
git add -A
git commit -m 'update book'
git push -f git@github.com:vuejs/vetur.git master:gh-pages