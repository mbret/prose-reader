<p align="center">
  <a 
  href="https://github.com/mbret/oboku">
    <img src="https://user-images.githubusercontent.com/1911240/99893449-bca35e00-2cc3-11eb-88c1-80b3190eb620.png" alt="Logo" width="75" height="75">
  </a>

  <h3 align="center">@prose-reader/core</h3>

  <p align="center">
    Official reader used by <a href="https://oboku.me">oboku</a>
    <br>
    <a href="https://github.com/mbret/prose-reader/issues/new">Report bug</a>
    ·
    <a href="https://github.com/mbret/prose-reader/issues/new">Request feature</a>
  </p>

  <p align="center">
    Web reader for digital content.
    <br>
    Visit the <a href="https://prose-reader-doc.vercel.app/">project</a> website
  </p>
</p>

### Development

```
yarn start
```

It will start the build for every projects and watch for changes. Each projects will rebuild based on each others.

### Tests

You can run all the tests by using:

```
yarn test
```

You can also use `--watch` when you want to develop on tests

```
yarn test --watch
```

see https://jestjs.io/docs/cli.

Run tests for a specific scope

`npx lerna run test --scope=@prose-reader/streamer`
