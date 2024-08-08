import { Observable, tap } from "rxjs"
import { SpineItemsManager } from "../SpineItemsManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"

export const loadItems =
  ({
    spineItemsManager,
    settings,
  }: {
    spineItemsManager: SpineItemsManager
    settings: ReaderSettingsManager
  }) =>
  (stream: Observable<readonly [number, number]>) =>
    stream.pipe(
      tap(([beginIndex, endIndex]) => {
        const { numberOfAdjacentSpineItemToPreLoad } = settings.settings
        /**
         * @todo
         * optimize useless calls to it, such as when the layout has not changed and the focus is still the same
         */
        const leftMaximumIndex = beginIndex - numberOfAdjacentSpineItemToPreLoad
        const rightMaximumIndex = endIndex + numberOfAdjacentSpineItemToPreLoad

        spineItemsManager.getAll().forEach((orderedSpineItem, index) => {
          const isWithinRange =
            index >= leftMaximumIndex && index <= rightMaximumIndex

          if (isWithinRange) {
            orderedSpineItem.load()
          } else {
            orderedSpineItem.unload()
          }
        })
      }),
    )
