import localforage from "localforage"
import { useQuery } from "reactjrx"

export const useUploadedBooks = () => {
  return useQuery({
    queryKey: ["uploadedBooks"],
    queryFn: async () => {
      const keys = await localforage.keys()

      return keys.map((name) => {
        return {
          name,
          base64Uri: btoa(`${encodeURIComponent(`file://epubs/${name}`)}`),
        }
      })
    },
  })
}
