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
autocomplete, in a stack trace, in a diff, without its comment or its file.
Name for that reader.

Internal and user-facing names are held to different bars. Internally, a name
has one job: describe itself to whoever maintains the code, reading it cold. A
consumer meets a user-facing name through a namespace, a type and the docs, and
writes it in their own code; that is the one place a name may give up some
explicitness to stay readable.

For every name:

- **Keep the name true.** A name that claims something the code does not do,
  such as `pending` for a value that is never cleared, is worse than a vague
  one.
- **Check a name where it is used.** Read the call site alone; if you have to
  open the definition to understand it, rename it.

### Internal names: self-describing, however long

Everything a consumer cannot reach: locals, module helpers, internal streams
and classes, private members, test helpers. Explicitness beats length and
looks. A long name that says what the thing is and what it is for is right. A
short, pretty one that leans on its surroundings is wrong, because the
surroundings do not travel with it.

- **Say what it is for, and in what context**, not only what it is.
  `getSelector` says what it returns; `xpointerToNavigationTarget` says what
  for. `xpointer$` gives a format; `readingPositionXPointer$` says what the
  value is.
- **Do not shorten for looks.** No abbreviations, and no dropping a qualifier
  because the file makes it look obvious: `isNavigatingToXPointer`, not
  `navigating`; `getLoadedSpineItemDocument`, not `getDoc`.
- **A name that needs its comment to be understood is the wrong name.**
  `isPending` needed a paragraph to explain it; `awaitsDocument` does not.
- **Qualify generic words** such as `get`, `handle`, `data`, `item`, `value`,
  `node`, `target` or `selector`. The file that makes one unambiguous today
  will not stay that way.

### User-facing names: explicit, until it gets convoluted

Anything a consumer can reach: what a package's entry point exports, what the
reader and its namespaces carry, options, streams, hook names, types, anything
`gitbook/` documents. Start from the internal bar. Soften it only when the fully
explicit name gets convoluted: it repeats its namespace, strings qualifiers
together, or reads as a sentence. Then:

- **Lean on the namespace.** In `reader.navigation.goToXPointer`, `navigation`
  already says what it is for.
- **Match the siblings.** `goToXPointer` sits next to `goToCfi` and
  `goToSpineItem`. A consistent surface is easier to learn than a locally more
  precise name.
- **Let the doc comment carry what the name cannot.** A consumer reads a public
  name with its doc comment, in the editor and in `gitbook/`. `goToXPointer`
  never animates: that is in its doc comment, not in
  `goToXPointerWithoutAnimation`.
- **Soften, never blur.** Drop only what the context already says, never what a
  consumer would have to guess. `readingPositionXPointer$` stays whole: on
  `reader.navigation`, `xpointer$` would not say which place it names.
- **The softening stops at the public name.** The code behind it keeps
  internal names: `goToXPointer` is built from `xpointerToNavigationTarget`.
- **List the user-facing names a change introduces** in its PR description, so
  they are reviewed together, before the code. For a softened one, give the
  explicit name you set aside; the maintainer decides.

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
