import { Reader } from "@oboku/reader"
import { useEffect } from "react"

export const useResizeReaderLayout = (reader?: Reader) => {
    useEffect(() => {
        window.addEventListener(`resize`, () => {
            reader?.layout()
        })
    }, [reader])
}