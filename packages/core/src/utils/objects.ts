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
