# Repository structure

This repository is a mono-repository and is using lerna. Take it into consideration when you want to check typescript, build or run tests for examples.

# Toolchain

Use the Node/npm toolchain the repo pins in `.nvmrc` — do not assume the shell's default Node is correct (web/CI shells may start on a different, older Node). Before running any `npm`, build, test, or lockfile command, activate the pinned version via nvm:

```sh
export NVM_DIR="${NVM_DIR:-/opt/nvm}" && . "$NVM_DIR/nvm.sh" && nvm install && nvm use
```

`nvm install`/`nvm use` read `.nvmrc` from the repo root, so this always follows whatever version is pinned there — no version numbers to keep in sync. Regenerate `package-lock.json` only with the npm that ships with that pinned Node: a mismatched npm rewrites native-binary metadata (e.g. dropping `libc`, mismarking optional platform binaries as `dev`) and produces spurious lockfile churn.

# Performances

This library needs to be very careful with everything that impact performances (eg: reflow, heavy dom computation). Whenever possible we should use
asynchronous lookup and mechanisms that defer, batch or are fast enough to not impact user experience while reading books.

An example of common issue is `getBoundingClientRect`. Getting elements position is a common use case across prose-reader. Ideally it should always
be in a very controlled way and with better performance alternative when possible (eg: `IntersectionObserver`)

# Epub SPECS

This library is built to support entirely and strictly the epub3 specs. You can access it at https://www.w3.org/TR/epub-33/. The spec and rules should always be enforced

# Non EPUB contents

We also support books that are not epubs (eg: comics, text, pdf). At some point the generated manifest and our handling of them should be consolidated and works the same as an epub. Translation and conversion are to be expected first.

# Layout and in-between stable states

Actions such as navigation can happens anytime (eg: user tap the screen) and in some case may happens during layout or other internal state change happening. This is expected and prose should be resilient to it. The entire internal process is asynchronous on purpose but some actions are synchronous. Make sure to always consider race or stale or invalid in between state conditions.

# Documentation

The `gitbook/` folder is user-facing documentation that must stay in sync with the code. After any change that alters the public surface or its documented behavior, check whether the docs need updating in the same change — do not defer it.

- Treat doc updates as part of the task, not a follow-up. A feature or fix is not done until the relevant docs reflect it.
- Things that almost always require a doc update: adding/removing/renaming a public export (e.g. a new `createArchiveFrom*` creator), changing a function signature or options, changing a documented type/contract, adding or changing a peer dependency or subpath export, and changing documented defaults or behavior.
- When adding something that belongs to an existing documented list/table (creators, enhancers, hooks, settings…), add it to that list and add a short usage example next to the sibling examples.
- If you add a new doc page, also register it in `gitbook/SUMMARY.md`.
- If a change is purely internal (no public surface or documented behavior affected), no doc update is needed — but state that you checked.

### TypeScript `as` usage

- Avoid using TypeScript's `as` type assertions unless absolutely necessary.
- Only use `as` when there is no safer or more idiomatic alternative (for example, when interfacing with third-party or legacy data you cannot control).
- When you need to use `as`, always add a code comment explaining why it is required in that context.
- Prefer type guards, runtime validation, and stricter data structures to ensure type safety and clarity instead of using type assertions.
- Rationale: Overuse of `as` can hide bugs, undermine type safety, and reduce code maintainability and refactorability.

## Avoid redundant DOM writes

When writing frontend code, avoid setting DOM attributes or properties to the same value they already have, especially in hot paths.

Redundant DOM writes can still have costs: they may update internal attribute state, notify mutation observers, trigger custom element reactions, invalidate style/layout work, or cause unnecessary accessibility/rendering updates.

### Applies to

Be careful with repeated writes such as:

```ts
element.setAttribute(name, value);
element.removeAttribute(name);
element.className = nextClassName;
element.textContent = nextText;
input.value = nextValue;
input.checked = nextChecked;
element.hidden = nextHidden;
```