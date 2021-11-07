export const blobToBase64 = async (blob: Blob | File) => new Promise<string>(resolve => {
  const reader = new FileReader()
  reader.readAsDataURL(blob)
  reader.onloadend = function () {
    const base64data = reader.result as string
    resolve(base64data)
  }
})
