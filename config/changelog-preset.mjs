/**
 * The changelog preset lerna versions with: conventionalcommits, with each
 * breaking-change note ending where the next footer starts.
 *
 * lerna 9 parses commits with conventional-commits-parser 4, which appends
 * every line after a `BREAKING CHANGE:` footer to its note until it meets an
 * issue reference. The trailers that end a commit message, such as
 * `Co-Authored-By:`, and whatever a squash merge puts after them, reached the
 * changelogs that way. The Conventional Commits specification ends a footer's
 * value at the next `token: value` or `token #value` line, and so does the
 * parser from 7.0.0 on. Once lerna parses with it, as lerna 10 does, this
 * preset has nothing left to do and `"conventionalcommits"` can come back.
 *
 * A note's first line is kept whatever it reads like: it is the text that
 * follows `BREAKING CHANGE:`, not the start of another footer.
 */
import createConventionalCommitsPreset from "conventional-changelog-conventionalcommits"

const FOOTER_TOKEN_LINE = /^[\w-]+(?::\s+|\s+#).+/

const noteTextBeforeNextFooter = (noteText) => {
  const [firstLine, ...followingLines] = noteText.split("\n")
  const nextFooterIndex = followingLines.findIndex((line) =>
    FOOTER_TOKEN_LINE.test(line),
  )

  if (nextFooterIndex === -1) return noteText

  return [firstLine, ...followingLines.slice(0, nextFooterIndex)]
    .join("\n")
    .trimEnd()
}

export default async function createChangelogPreset(config) {
  const preset = await createConventionalCommitsPreset(config)
  const writerOpts = {
    ...preset.writerOpts,
    transform: (commit, context) =>
      preset.writerOpts.transform(
        {
          ...commit,
          notes: commit.notes.map((note) => ({
            ...note,
            text: noteTextBeforeNextFooter(note.text),
          })),
        },
        context,
      ),
  }

  return {
    ...preset,
    writerOpts,
    conventionalChangelog: { ...preset.conventionalChangelog, writerOpts },
  }
}
