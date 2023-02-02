import React, { memo } from "react"
import { ReaderInstance } from "./types"
import { useManifest } from "./useManifest"
import { Reader as ClassicReader } from "./classic/Reader"
import { Reader as ComicsReader } from "./comics/Reader"
import { useParams } from "react-router-dom"
import { TocDialog } from "./TocDialog"
import { useRecoilState } from "recoil"
import { isTocOpenState } from "./state"

export const Reader = memo(({ onReader }: { onReader: (instance: ReaderInstance | undefined) => void }) => {
  const { url = `` } = useParams<`url`>()
  const { data: manifest, error: manifestError } = useManifest(url)
  const [isTocOpen, setIsTocOpen] = useRecoilState(isTocOpenState)

  return (
    <>
      {!!manifestError && <ComicsReader onReader={onReader} manifestError={manifestError} />}
      {manifest?.renditionLayout === "pre-paginated" && <ComicsReader onReader={onReader} manifest={manifest} />}
      {manifest?.renditionLayout === "reflowable" && <ClassicReader onReader={onReader} manifest={manifest} />}
      <TocDialog isOpen={isTocOpen} onExit={() => setIsTocOpen(false)} />
    </>
  )
})
