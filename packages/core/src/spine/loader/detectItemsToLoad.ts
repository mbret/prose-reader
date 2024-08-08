import { map, Observable } from "rxjs"
import { ViewportPosition } from "../../navigation/ViewportNavigator"
import { SpineLocationResolver } from "../resolvers/SpineLocationResolver"

export const detectItemsToLoad =
  ({ spineLocator }: { spineLocator: SpineLocationResolver }) =>
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
