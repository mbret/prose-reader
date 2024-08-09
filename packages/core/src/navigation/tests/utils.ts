/* eslint-disable @typescript-eslint/no-explicit-any */
import { BehaviorSubject, of, Subject } from "rxjs"
import { Context } from "../../context/Context"
import { HookManager } from "../../hooks/HookManager"
import { ReaderSettingsManager } from "../../settings/ReaderSettingsManager"
import { createSpineLocator } from "../../spine/locator/SpineLocator"
import { createSpineItemLocator } from "../../spineItem/locationResolver"
import { InternalNavigator } from "../InternalNavigator"
import { createNavigationResolver } from "../resolvers/NavigationResolver"
import { UserNavigator } from "../UserNavigator"
import { ViewportNavigator } from "../viewport/ViewportNavigator"
import { Item, SpineItemsManagerMock } from "./SpineItemsManagerMock"
import { Spine } from "../../spine/Spine"
import { noopElement } from "../../utils/dom"
import { Pagination } from "../../pagination/Pagination"

export const generateItems = (size: number, number: number) => {
  return Array.from(Array(number)).map(
    (_, index) =>
      ({
        left: index * size,
        top: 0,
        right: (index + 1) * size,
        bottom: size,
        width: size,
        height: size,
      }) as Item,
  )
}

export const createNavigator = () => {
  const context = new Context()
  const settings = new ReaderSettingsManager({}, context)
  const spineItemsManagerMock = new SpineItemsManagerMock()
  const pagination = new Pagination(context, spineItemsManagerMock as any)
  const spineItemLocator = createSpineItemLocator({ context, settings })
  const hookManager = new HookManager()
  const spine = new Spine(
    of(noopElement()),
    context,
    pagination,
    spineItemsManagerMock as any,
    spineItemLocator,
    settings,
    hookManager,
  )
  const elementSubject = new BehaviorSubject<HTMLElement>(
    document.createElement(`div`),
  )
  const spineLocator = createSpineLocator({
    context,
    settings,
    spineItemLocator,
    spineItemsManager: spineItemsManagerMock as any,
  })
  const navigationResolver = createNavigationResolver({
    context,
    locator: spineLocator,
    settings,
    spineItemsManager: spineItemsManagerMock as any,
  })
  const viewportController = new ViewportNavigator(
    settings,
    elementSubject,
    hookManager,
    context,
    spine,
  )

  const scrollHappeningFromBrowser$ = new Subject()

  const userNavigator = new UserNavigator(
    settings,
    elementSubject,
    context,
    scrollHappeningFromBrowser$,
  )

  const internalNavigator = new InternalNavigator(
    settings,
    context,
    userNavigator.navigation$,
    viewportController,
    navigationResolver,
    spineItemsManagerMock as any,
    spineLocator,
    elementSubject,
    userNavigator.locker.isLocked$,
  )

  return { internalNavigator, userNavigator, context, spineItemsManagerMock }
}
