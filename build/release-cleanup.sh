# Deps
yarn

# Compile / Test
yarn compile
yarn test:server

# Remove server devDependencies
cd server && yarn --prod && cd ..
