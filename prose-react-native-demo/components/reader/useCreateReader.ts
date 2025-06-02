import { useCreateReader as useProseReader } from "@prose-reader/react-native"
import type { Archive } from "@prose-reader/streamer"

export const useCreateReader = ({ archive }: { archive: Archive | null }) => {
  return useProseReader({
    /**
     * For a given spine item, provide the resource to the webview.
     */
    async getResource(resource: { href: string }) {
      const record = archive?.records.find((file) =>
        resource.href.endsWith(file.uri),
      )

      if (record?.dir) throw new Error("Record unsupported")

      const stringData = await record?.string()

      return {
        data: stringData ?? "",
        ...(record?.encodingFormat && {
          headers: {
            "Content-Type": record?.encodingFormat,
          },
        }),
      }
    },
  })
}
