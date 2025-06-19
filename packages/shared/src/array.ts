// biome-ignore lint/suspicious/noExplicitAny: TODO
export const arrayEqual = <A extends any[], B extends any[]>(a: A, b: B) => {
  // @ts-expect-error
  if (a === b) return true
  if (a.length !== b.length) return false

  return a.every((v, i) => v === b[i])
}
