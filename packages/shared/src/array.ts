// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const arrayEqual = <A extends any[], B extends any[]>(a: A, b: B) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  if (a === b) return true
  if (a.length !== b.length) return false

  return a.every((v, i) => v === b[i])
}
