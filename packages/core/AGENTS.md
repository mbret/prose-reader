# @prose-reader/core

## Manifest lifecycle

A new `context.manifest$` emission means a different book has been loaded. There is no partial or incremental manifest update — each emission is a complete replacement.

When writing code that reacts to `context.manifest$`, do not diff previous and next manifest contents or attempt to reconcile individual items across emissions. If downstream state depends on the manifest (e.g. a track list derived from spine items), a full reset of that state is the correct response to a new emission.

## Tests

The vitest suite runs in happy-dom, or jsdom where a file asks for it. That is
enough to drive a real reader through its in-between states —
`src/pagination/settlement.test.ts` mounts one with the real renderer and
watches results settle — but nothing in it can lay content out. Behaviour that
depends on layout is verified by the browser suite in `apps/tests`, and a core
change in that area is not covered until it has a spec there. The root
`AGENTS.md`, Testing, says which layer a change belongs to.
