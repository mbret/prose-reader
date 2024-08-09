import { map, Observable } from "rxjs"
import {
  InternalNavigationEntry,
  InternalNavigationInput,
} from "../InternalNavigator"
import { SpineItemsManager } from "../../spine/SpineItemsManager"

type Navigation = {
  navigation: InternalNavigationInput | InternalNavigationEntry
}

export const withSpineItemLayoutInfo =
  ({ spineItemsManager }: { spineItemsManager: SpineItemsManager }) =>
  <N extends Navigation>(stream: Observable<N>): Observable<N> => {
    return stream.pipe(
      map(({ navigation, ...rest }) => {
        const spineItemDimensions = spineItemsManager.getAbsolutePositionOf(
          navigation.spineItem,
        )
        const spineItem = spineItemsManager.get(navigation.spineItem)

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
