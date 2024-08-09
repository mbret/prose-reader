import { map, Observable } from "rxjs"
import { ViewportPosition } from "../../navigation/viewport/ViewportNavigator"
import { SpineLocator } from "../locator/SpineLocator"

export const mapToItemsToLoad =
  ({ spineLocator }: { spineLocator: SpineLocator }) =>
  (stream: Observable<ViewportPosition>) =>
    stream.pipe(
      map((position) => {
        const { beginIndex = 0, endIndex = 0 } =
          spineLocator.getVisibleSpineItemsFromPosition({
            position,
            threshold: 0,
          }) || {}

        return [beginIndex, endIndex] as const
      }),
    )
