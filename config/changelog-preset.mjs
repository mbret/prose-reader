/**
 * The conventionalcommits preset, reading a breaking change only where the
 * Conventional Commits spec puts one: a footer at the start of a line, the
 * uppercase `BREAKING CHANGE` or `BREAKING-CHANGE` token, then a colon. The `!`
 * subject marker still counts, through the preset's own header pattern.
 *
 * lerna 9 parses commits with conventional-commits-parser 4, whose default
 * notes pattern takes any line starting with "breaking change", in any case,
 * with or without a colon. Prose in a commit body that merely begins with
 * those words opens a breaking note, as one did in 2.0.0's changelog, and the
 * preset bumps a major for any note, so that line alone releases one. Parser
 * 7.1.2, which lerna 10.0.1 pins, requires the colon and the line start,
 * though not the uppercase. lerna 9 cannot use it; upgrading can retire this
 * file, keeping the uppercase rule only if something else still enforces it.
 *
 * The preset hands one parser options object to three places: the top level,
 * `recommendedBumpOpts`, which the bump reads, and `conventionalChangelog`,
 * which the changelog reads. The new options go to all three rather than
 * relying on them sharing that object.
 */
import createConventionalCommitsPreset from "conventional-changelog-conventionalcommits"

/** @param {string} noteKeywords the preset's keywords, joined with `|` */
const breakingChangeFooterPattern = (noteKeywords) =>
  new RegExp(`^(${noteKeywords}):\\s*(.*)`)

export default async function createChangelogPreset(config) {
  const preset = await createConventionalCommitsPreset(config)
  const parserOpts = {
    ...preset.parserOpts,
    notesPattern: breakingChangeFooterPattern,
  }

  return {
    ...preset,
    parserOpts,
    recommendedBumpOpts: { ...preset.recommendedBumpOpts, parserOpts },
    conventionalChangelog: { ...preset.conventionalChangelog, parserOpts },
  }
}
