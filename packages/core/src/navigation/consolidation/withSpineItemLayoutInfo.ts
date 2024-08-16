import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { Spine } from "../../spine/Spine"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
}

export const withSpineItemLayoutInfo =
  ({ spine }: { spine: Spine }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const spineItemDimensions = spine.spineLayout.getAbsolutePositionOf(
          navigation.spineItem,
        )
        const spineItem = spine.spineItemsManager.get(navigation.spineItem)

        return {
          navigation: {
            ...navigation,
            spineItemHeight: spineItemDimensions?.height,
            spineItemWidth: spineItemDimensions?.width,
            spineItemLeft: spineItemDimensions.left,
            spineItemTop: spineItemDimensions.top,
            spineItemIsUsingVerticalWriting:
              spineItem?.isUsingVerticalWriting(),
          },
          ...rest,
        } as N
      }),
    )
  }
