# @prose-reader/core

## Manifest lifecycle

A new `context.manifest$` emission means a different book has been loaded. There is no partial or incremental manifest update — each emission is a complete replacement.

When writing code that reacts to `context.manifest$`, do not diff previous and next manifest contents or attempt to reconcile individual items across emissions. If downstream state depends on the manifest (e.g. a track list derived from spine items), a full reset of that state is the correct response to a new emission.
