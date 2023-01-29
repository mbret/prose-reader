import { useCallback, useEffect, useState } from "react"
import localforage from "localforage"

export const useUploadedBooks = () => {
  const [uploadedBooks, setUploadedBooks] = useState<{ name: string }[]>([])

  const refresh = useCallback(async () => {
    const keys = await localforage.keys()
    setUploadedBooks(keys.map((name) => ({ name })))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { uploadedBooks, refresh }
}
