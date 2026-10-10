# Contributing to prose

Bug reports, fixes, documentation and features are welcome. Everyone taking
part follows the [code of conduct](CODE_OF_CONDUCT.md).

## Ask a question or report a bug

Open a [GitHub issue](https://github.com/mbret/prose-reader/issues) for a bug,
a feature request or a question. For a quick chat, join the
[oboku & prose Discord server](https://discord.gg/dffDEgwNc5).

A bug report needs:

- the `@prose-reader/*` packages you use, with their versions;
- the browser and OS, or the React Native platform;
- the book that shows the problem, or a public one that does;
- the steps, what you expected, and what happened instead.

Try the book in the [live demo](https://prose-reader.com/demo) too, and say
whether the problem shows there.

Before a large change, open an issue to agree on the approach.

## Set up the repository

The README's [Contributing section](README.md#contributing) covers the
repository layout, the pinned toolchain, the commands to build and run the
code, and the [checks](README.md#checks) CI runs.

## Code guidelines

[AGENTS.md](AGENTS.md) holds the engineering guidelines, for people and coding
agents alike. A few of its rules, in short:

- Every change should leave the code better. When the surrounding design is
  what causes a bug, change the design rather than patching around it.
- Breaking changes are fine when they give a smaller, simpler API. Do not keep
  a deprecated alias, a compatibility flag or a shim. Update every consumer in
  the repository, and mark the commit as breaking.
- EPUB support follows the
  [EPUB 3.3 specification](https://www.w3.org/TR/epub-33/) strictly.
- Nothing in the library exists only for a test: a spec uses what the library
  exposes, and does not add to it.

The `writing-typescript` skill,
[.agents/skills/writing-typescript/SKILL.md](.agents/skills/writing-typescript/SKILL.md),
holds the code-level rules: naming, deriving state with rxjs, DOM reads and
writes, and TypeScript `as`. Read it before you write code.

Guidelines for a single package go in its own `AGENTS.md`, with a `CLAUDE.md`
beside it whose body is `@AGENTS.md`. A skill goes in `.agents/skills/<name>`,
with a symlink to it at `.claude/skills/<name>`. `pnpm run check:agent-docs`
enforces both.

### Tests

- Cover logic and in-between states with vitest, in the package.
- Cover anything that depends on layout with a spec in `apps/tests`.
- Watch a regression test fail against the unfixed code before you rely on it,
  and check that it fails on the assertion you meant.

### Dependencies

- Declare a dependency in the package that imports it. pnpm gives each package
  only what its own manifest declares.
- Reference a sibling package with `workspace:^` from a published package, and
  with `workspace:*` from a private app.
- Name a sibling in one dependency field of a package only. A peer dependency
  on a sibling needs no devDependency beside it.
- Regenerate `pnpm-lock.yaml` only with the pinned pnpm.

`pnpm run check:internal-ranges` enforces the two rules on siblings.

## Pull requests

1. Fork the repository, and branch off `master`.
2. Make the change, with its tests and its documentation.
3. Run the [checks](README.md#checks) your change touches. CI runs all of
   them on your pull request.
4. Open a pull request against `master`. Say what changed and why. List the
   public names it adds, renames or removes, and say whether it breaks the
   API.

Pull requests are merged with a merge commit, or rebased, and never squashed.
Each of your commits lands on `master` as you wrote it, so each one needs a
conventional message.

Every merge to `master` that changes a published package releases it. CI
derives the version from the commit messages, updates `CHANGELOG.md`, tags the
release and publishes the changed packages to npm. Do not bump a version or
edit `CHANGELOG.md` yourself.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/):
`type(scope): subject`, with the subject in the imperative and in lowercase.

```text
fix(core): hold one document at a time in a renderer
```

- Types in use: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci` and
  `chore`.
- The scope is optional. Name the package or the area you changed: `core`,
  `navigation`, `archive-reader`, `react-native`.
- Mark a breaking change with `!` after the type or scope, and describe it in a
  `BREAKING CHANGE:` footer: what a consumer has to change. `CHANGELOG.md`
  quotes the footer as written.

The commits decide the release of the packages they change:

| Commits since the last release   | Release |
| -------------------------------- | ------- |
| a breaking change                | major   |
| a `feat`, and no breaking change | minor   |
| anything else                    | patch   |

## Documentation

`gitbook/` holds the user documentation, published at
[doc.prose-reader.com](https://doc.prose-reader.com/). Update it in the same
pull request as any change to the public API or its documented behaviour:
exports, signatures, options, types, defaults, peer dependencies, subpath
exports.

- Document the new surface only, with no note about how it used to work.
- When you change a guide, reread the whole section against the code, not only
  the lines you touch.
- Add a new item to the list or table it belongs to (creators, enhancers,
  hooks, settings), with a short example next to its siblings.
- Register a new page in `gitbook/SUMMARY.md`.
- If the change is internal, say in the pull request that you checked the
  documentation.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
