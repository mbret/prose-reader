const ISBN_13 = /^\d{13}$/
const ISBN_10 = /^\d{9}[\dX]$/

/**
 * Put an ISBN in its 13-digit form so the two printed on the same book
 * compare equal. A book carries an ISBN-10 in its OPF and an ISBN-13 in a
 * catalog record all the time; comparing them verbatim would read as
 * "different books", which — ISBN being a decisive match signal — is the most
 * damaging false negative the matcher can produce.
 *
 * Returns `undefined` when the input is neither form (check digits are not
 * verified: a wrong one still identifies the intended book).
 */
export const toIsbn13 = (isbn: string): string | undefined => {
  const value = isbn.trim().toUpperCase()

  if (ISBN_13.test(value)) return value
  if (!ISBN_10.test(value)) return undefined

  // ISBN-10 → ISBN-13: prefix the 978 Bookland code, drop the ISBN-10 check
  // digit, recompute the EAN-13 one (weights 1,3,1,3…).
  const core = `978${value.slice(0, 9)}`
  let sum = 0

  for (let index = 0; index < core.length; index++) {
    // charCodeAt over indexing: `noUncheckedIndexedAccess` types `core[i]` as
    // possibly undefined even though the length is known here
    const digit = core.charCodeAt(index) - 48

    sum += index % 2 === 0 ? digit : digit * 3
  }

  return `${core}${(10 - (sum % 10)) % 10}`
}
