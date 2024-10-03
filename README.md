<p align="center">
  <a 
  href="https://github.com/mbret/oboku" >
    <img src="https://github.com/user-attachments/assets/eb8c0c42-743a-46db-bbc4-ce92795a80f5" style="background-color:white;display:inline-block;border-radius:10px;" alt="Logo" width="75" height="75">
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
