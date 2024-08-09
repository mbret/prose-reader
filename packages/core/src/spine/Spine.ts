import { BehaviorSubject, merge, Observable } from "rxjs"
import { share, switchMap, takeUntil, tap } from "rxjs/operators"
import { Context } from "../context/Context"
import { Pagination } from "../pagination/Pagination"
import { createSpineItem } from "../spineItem/createSpineItem"
import { SpineItemsManager } from "./SpineItemsManager"
import { createSpineLocator, SpineLocator } from "./locator/SpineLocator"
import { createSpineItemLocator as createSpineItemLocationResolver } from "../spineItem/locationResolver"
import { HTML_PREFIX } from "../constants"
import { ReaderSettingsManager } from "../settings/ReaderSettingsManager"
import { HookManager } from "../hooks/HookManager"
import { SpineItemsLoader } from "./loader/SpineItemsLoader"
import { observeResize } from "../utils/rxjs"
import { DestroyableClass } from "../utils/DestroyableClass"
import { noopElement } from "../utils/dom"

export class Spine extends DestroyableClass {
  protected elementSubject = new BehaviorSubject<HTMLElement>(noopElement())
  protected spineItemsLoader: SpineItemsLoader

  public locator: SpineLocator

  public elementResize$ = this.elementSubject.pipe(
    switchMap((element) => observeResize(element)),
    share(),
  )

  public element$ = this.elementSubject.asObservable()

  constructor(
    protected parentElement$: Observable<HTMLElement>,
    protected context: Context,
    protected pagination: Pagination,
    protected spineItemsManager: SpineItemsManager,
    public spineItemLocator: ReturnType<typeof createSpineItemLocationResolver>,
    protected settings: ReaderSettingsManager,
    protected hookManager: HookManager,
  ) {
    super()

    this.locator = createSpineLocator({
      context,
      spineItemsManager,
      spineItemLocator,
      settings,
    })

    this.spineItemsLoader = new SpineItemsLoader(
      this.context,
      spineItemsManager,
      this.locator,
      settings,
    )

    const reloadOnManifestChange$ = context.manifest$.pipe(
      tap((manifest) => {
        this.spineItemsManager.destroyItems()

        const spineItems = manifest.spineItems.map((resource, index) =>
          createSpineItem({
            item: resource,
            containerElement: this.elementSubject.getValue(),
            context: this.context,
            settings: this.settings,
            hookManager: this.hookManager,
            index,
          }),
        )

        this.spineItemsManager.addMany(spineItems)
      }),
    )

    const updateElement$ = parentElement$.pipe(
      tap((parentElement) => {
        const element: HTMLElement =
          parentElement.ownerDocument.createElement(`div`)
        element.style.cssText = `
          height: 100%;
          position: relative;
        `
        element.className = `${HTML_PREFIX}-spine`

        this.elementSubject.next(element)
      }),
    )

    merge(reloadOnManifestChange$, updateElement$)
      .pipe(takeUntil(this.destroy$))
      .subscribe()
  }

  public get element() {
    return this.elementSubject.getValue()
  }

  public layout() {
    this.spineItemsManager.layout()
  }

  public isSelecting() {
    return this.spineItemsManager.items.some((item) =>
      item.selectionTracker.isSelecting(),
    )
  }

  public getSelection() {
    return this.spineItemsManager.items
      .find((item) => item.selectionTracker.getSelection())
      ?.selectionTracker.getSelection()
  }

  public get layout$() {
    return this.spineItemsManager.layout$
  }

  public destroy() {
    super.destroy()

    this.spineItemsLoader.destroy()
    this.elementSubject.getValue().remove()
    this.elementSubject.complete()
  }
}
