# Security policy

Report a vulnerability privately, through GitHub: on the
[Security tab](https://github.com/mbret/prose-reader/security), click
**Report a vulnerability**. Don't open a public issue or pull request for it,
and don't post it on Discord.

The report opens a private security advisory that only you and the maintainer
can see. The discussion and the fix happen there.

## What to include

- the `@prose-reader/*` packages involved, with their versions, or the metadata
  fetcher image;
- what an attacker can do, such as running a script from a crafted book, and
  what they need first;
- the steps to reproduce, or a proof of concept. Attach a book that triggers it
  to the advisory, never to a public issue;
- the browser and OS, or the React Native platform.

## Supported versions

Security fixes ship in a new release of the affected packages, published to
npm, and only the latest version of each package gets them.
