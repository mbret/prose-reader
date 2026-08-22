import { normalizeIsbn } from "./normalizeIsbn.ts"

/**
 * The ISBN a raw value denotes, or `undefined` when the value is not one.
 *
 * `normalizeIsbn` recovers ISBN *syntax* only: any 10- or 13-character digit
 * run satisfies it, so a scanned comic's retail barcode (`4006381333931`)
 * comes back looking like an ISBN. Books occupy the Bookland range of the GTIN
 * space — an ISBN-13 always starts with `978` or `979` — so requiring that
 * prefix is what separates a real ISBN from any other EAN. ISBN-10 predates
 * Bookland and is accepted on its length alone (it converts into a `978`
 * ISBN-13).
 *
 * Check digits are not verified: a mistyped one still identifies the intended
 * book, and rejecting it would lose more than it protects.
 */
export const booklandIsbn = (
  raw: string | number | undefined | null,
): string | undefined => {
  const isbn = normalizeIsbn(raw)

  if (isbn === undefined) return undefined

  return isbn.length === 10 || /^97[89]/.test(isbn) ? isbn : undefined
}
