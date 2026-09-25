---
name: writing-typescript
description: >
  How to write TypeScript and JavaScript in prose-reader: naming things for
  what they are for, deriving state with rxjs rather than writing it from
  several places, keeping DOM reads and writes cheap, and when a TypeScript
  `as` is acceptable. Load it before writing, changing or reviewing any code
  in this repository, in any package, app, test or script.
---

# Writing TypeScript in prose-reader

The repository-wide principles in `AGENTS.md` still apply: raising quality is
the job, breaking changes are not a constraint, layout-dependent behaviour needs
a browser test. This skill is about the code itself.

## Naming

A name is read far more often than its definition: at a call site, in
autocomplete, in a stack trace, without its comment or its file. Name for that
reader.

- **Say what it is for, and in what context**, not only what it is.
  `getSelector` says what it returns; `xpointerToNavigationTarget` says what
  for. `xpointer$` gives a format; `readingPositionXPointer$` says what the
  value is.
- **A name that needs its comment to be understood is the wrong name.**
  `isPending` needed a paragraph to explain it; `awaitsDocument` does not.
- **Qualify generic words** such as `get`, `handle`, `data`, `item`, `value`,
  `node`, `target` or `selector` in a file that does more than one thing.
- **Public names (exports, reader API, options, streams, types) must make
  sense without the docs.**
- **Check a name where it is used.** Read the call site alone; if you have to
  open the definition to understand it, rename it.
- **Keep the name true.** A name that claims something the code does not do,
  such as `pending` for a value that is never cleared, is worse than a vague
  one.
- **List the names a change introduces** (exports, options, streams, types) in
  its PR description, so they are reviewed together, before the code.

## Prefer derived state over imperative updates

This is an rxjs codebase and the general principle holds: **if a value can be
derived, derive it.** Do not assume imperative code is the way to go just
because that is what is already there.

A value several places write by hand is the recurring bug in this repository.
Every writer has to remember the rules, one of them eventually does not, and the
failure surfaces far from its cause. A value produced by a single stream cannot
have that bug, because there is no second writer to forget anything.

Treat these as smells to rework rather than extend:

- the same field written from more than one place
- a flag that whoever starts some work has to clear — sooner or later an entry
  point will not clear it
- state deposited into a mutable holder mid-stream and re-read downstream,
  instead of flowing through the pipeline as a value
- a `tap` that writes state where a `map` could produce it

Imperative code is sometimes genuinely clearer, and readability counts: a `scan`
nobody can follow is not an improvement. Derive where you can, and say why when
you deliberately do not.

## Performance

This library needs to be very careful with everything that impact performances (eg: reflow, heavy dom computation). Whenever possible we should use
asynchronous lookup and mechanisms that defer, batch or are fast enough to not impact user experience while reading books.

An example of common issue is `getBoundingClientRect`. Getting elements position is a common use case across prose-reader. Ideally it should always
be in a very controlled way and with better performance alternative when possible (eg: `IntersectionObserver`)

### Avoid redundant DOM writes

When writing frontend code, avoid setting DOM attributes or properties to the same value they already have, especially in hot paths.

Redundant DOM writes can still have costs: they may update internal attribute state, notify mutation observers, trigger custom element reactions, invalidate style/layout work, or cause unnecessary accessibility/rendering updates.

#### Applies to

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

## TypeScript `as` usage

- Avoid using TypeScript's `as` type assertions unless absolutely necessary.
- Only use `as` when there is no safer or more idiomatic alternative (for example, when interfacing with third-party or legacy data you cannot control).
- When you need to use `as`, always add a code comment explaining why it is required in that context.
- Prefer type guards, runtime validation, and stricter data structures to ensure type safety and clarity instead of using type assertions.
- Rationale: Overuse of `as` can hide bugs, undermine type safety, and reduce code maintainability and refactorability.
