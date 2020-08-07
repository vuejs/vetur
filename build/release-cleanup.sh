# Deps
yarn

# Compile / Test
yarn compile
(cd server && yarn test)

# Remove server devDependencies
cd server && yarn --prod && cd ..
