/**
 * Extract the calendar components of a W3CDTF literal — the
 * date subset of ISO 8601 that EPUB 3.3 § 5.5.3.2.4 mandates for
 * `dc:date`. Accepted forms: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, and
 * any of the above followed by a `Thh:mm[:ss[.s]][TZD]` time
 * portion that we ignore.
 *
 * Components are returned as plain integers (`month` is 1-12,
 * `day` is 1-31), independent of the host timezone — using
 * `Date.parse` would shift `2011-01-01` by a day in negative-offset
 * locales, which is the exact bug this regex-based approach exists
 * to avoid. Returns `undefined` when the input doesn't even match
 * a leading 4-digit year so consumers can fall back without
 * branching on partial shapes.
 */
export const parseW3cDtfDate = (
  raw: string | undefined,
):
  | {
      year?: number
      month?: number
      day?: number
    }
  | undefined => {
  if (raw === undefined) return undefined

  const match = raw.trim().match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/)
  if (match === null) return undefined

  const [, yearRaw, monthRaw, dayRaw] = match

  return {
    ...(yearRaw !== undefined ? { year: Number.parseInt(yearRaw, 10) } : {}),
    ...(monthRaw !== undefined ? { month: Number.parseInt(monthRaw, 10) } : {}),
    ...(dayRaw !== undefined ? { day: Number.parseInt(dayRaw, 10) } : {}),
  }
}
