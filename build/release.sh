# Deps
yarn --prod
cd server && yarn --prod && cd ..

# Compile / Test
yarn compile
yarn test:server

# Publish
vsce publish