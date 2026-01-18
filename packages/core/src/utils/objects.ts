export { isShallowEqual } from "@prose-reader/shared"

export const getBase64FromBlob = (data: Blob) => {
  const reader = new FileReader()

  return new Promise<string>((resolve) => {
    reader.addEventListener(
      `load`,
      () => {
        resolve(reader.result as string)
      },
      false,
    )

    reader.readAsDataURL(data)
  })
}

export const pick = <R extends Record<string, unknown>, K extends keyof R>(
  obj: R,
  keys: K[],
): Pick<R, K> => {
  return Object.entries(obj).reduce(
    (acc, [key, entry]) => {
      // biome-ignore lint/suspicious/noExplicitAny: TODO
      if (keys.includes(key as any)) {
        return {
          ...acc,
          [key]: entry,
        }
      }

      return acc
    },
    {} as Pick<typeof obj, K>,
  )
}
