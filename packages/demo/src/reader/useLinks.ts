import { useSubscribe } from "reactjrx"
import { useReader } from "./useReader"

export const useLinks = () => {
  const { reader } = useReader()

  useSubscribe(
    () =>
      reader?.$.links$.subscribe((data) => {
        if (data.event === "linkClicked") {
          if (!data.data.href) return
          const url = new URL(data.data.href)
          if (window.location.host !== url.host) {
            const response = confirm(`You are going to be redirected to external link`)
            if (response) {
              window.open(data.data.href, "__blank")
            }
          }
        }
      }),
    [reader]
  )
}
