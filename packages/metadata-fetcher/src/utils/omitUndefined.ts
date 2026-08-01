/**
 * Returns a copy of `obj` without the keys whose value is `undefined`, so
 * results stay sparse (an absent key and an `undefined` value are the same
 * statement: "nothing was found for this field").
 */
export const omitUndefined = <T extends object>(obj: T): T => {
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined)

  // `as T`: Object.entries/fromEntries erase the key–value pairing; filtering
  // only drops `undefined` values, which `T`'s optional fields already allow,
  // so the runtime shape is a subset of `T` with no way to express it inline.
  return Object.fromEntries(entries) as T
}
