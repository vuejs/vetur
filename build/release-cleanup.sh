# Deps
yarn
cd server && yarn && cd ..

# Compile / Test
yarn compile
yarn test:server

# Remove server devDependencies
cd server && yarn --prod && cd ..