import { type Observable, first, map, of, switchMap } from "rxjs"
import type { Spine } from "../../spine/Spine"
import type { InternalNavigationEntry, InternalNavigationInput } from "../types"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
}

export const withSpineItemLayoutInfo =
  ({ spine }: { spine: Spine }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      switchMap(({ navigation, ...rest }) => {
        const spineItemDimensions =
          spine.spineLayout.getSpineItemSpineLayoutInfo(navigation.spineItem)
        const spineItem = spine.spineItemsManager.get(navigation.spineItem)

        return (spineItem?.isReady$ ?? of(false)).pipe(
          first(),
          map(
            (isReady) =>
              ({
                navigation: {
                  ...navigation,
                  spineItemHeight: spineItemDimensions?.height,
                  spineItemWidth: spineItemDimensions?.width,
                  spineItemLeft: spineItemDimensions.left,
                  spineItemTop: spineItemDimensions.top,
                  spineItemIsUsingVerticalWriting:
                    spineItem?.isUsingVerticalWriting(),
                  spineItemIsReady: isReady,
                },
                ...rest,
              }) as N,
          ),
        )
      }),
    )
  }
