# webpack-npm-build

`webpack-npm-build` triggers `npm run build` when it detects a `package.json` with a build script when trying to resolve a sub-directory.

This is useful for projects containing self-contained sub-packages with their own build/test scripts, for example in monorepos.
