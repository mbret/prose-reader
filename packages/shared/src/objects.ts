/**
 * Return true if `objectA` is shallow equal to `objectB`.
 *
 * - Primitives are compared with `Object.is` (so `NaN === NaN`, `+0 ≠ -0`).
 * - Objects and arrays are compared by their own enumerable string keys,
 *   each value pair compared with `Object.is` (or `customEqual`).
 * - Two objects with the same keys but different prototypes are considered
 *   equal — class identity is not checked.
 *
 * Pass `customEqual` to override the per-value comparator (e.g. to recurse
 * one level deeper, or to compare specific value types by content).
 */
export const isShallowEqual = <A = unknown, B = unknown>(
  objectA: A,
  objectB: B,
  options?: {
    customEqual?: (a: unknown, b: unknown) => boolean
  },
): boolean => {
  if (Object.is(objectA, objectB)) {
    return true
  }
  if (
    typeof objectA !== "object" ||
    objectA === null ||
    typeof objectB !== "object" ||
    objectB === null
  ) {
    return false
  }

  const keysA = Object.keys(objectA)
  const keysB = Object.keys(objectB)

  if (keysA.length !== keysB.length) {
    return false
  }

  const isEqual = options?.customEqual ?? Object.is

  // Indexable cast after narrowing to non-null `object`: TypeScript doesn't
  // widen `object` itself, but every iterated key is verified as own via
  // `Object.keys` / `Object.hasOwn`.
  const a = objectA as Record<string, unknown>
  const b = objectB as Record<string, unknown>

  for (const key of keysA) {
    if (!Object.hasOwn(b, key) || !isEqual(a[key], b[key])) {
      return false
    }
  }

  return true
}

// biome-ignore lint/suspicious/noExplicitAny: TODO
export const groupBy = <T, K extends keyof any>(
  list: T[],
  getKey: (item: T) => K,
) =>
  list.reduce(
    (previous, currentItem) => {
      const group = getKey(currentItem)
      if (!previous[group]) previous[group] = []
      previous[group].push(currentItem)
      return previous
    },
    {} as Record<K, T[]>,
  )

export function shallowMergeIfDefined<T extends object, U extends object>(
  obj1: T,
  obj2: U,
): T & U {
  const result = { ...obj1 } as T & U

  for (const key in obj2) {
    if (Object.hasOwn(obj2, key)) {
      // biome-ignore lint/suspicious/noExplicitAny: TODO
      const value = (obj2 as any)[key]
      if (value !== undefined || !(key in obj1)) {
        // biome-ignore lint/suspicious/noExplicitAny: TODO
        ;(result as any)[key] = value
      }
    }
  }

  return result
}
