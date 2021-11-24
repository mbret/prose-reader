import { chromeEnhancer } from './enhancers/chrome'
import { fontsEnhancer } from './enhancers/fonts'
import { hotkeysEnhancer } from './enhancers/hotkeys'
import { layoutEnhancer } from './enhancers/layout'
import { linksEnhancer } from './enhancers/links'
import { navigationEnhancer } from './enhancers/navigation'
import { paginationEnhancer } from './enhancers/pagination'
import { themeEnhancer } from './enhancers/theme'
import { ComposeEnhancer, composeEnhancer } from './enhancers/composeEnhancer'
import { Enhancer } from './enhancers/types'
import { zoomEnhancer } from './enhancers/zoom'
import { createReader as createInternalReader } from './reader'
import { utilsEnhancer } from './enhancers/utils'
import { resourcesEnhancer } from './enhancers/resources'
import { mediaEnhancer } from './enhancers/media'
import { progressionEnhancer } from './enhancers/progression'
import { accessibilityEnhancer } from './enhancers/accessibility'
import { webkitEnhancer } from './enhancers/webkit'

type ReaderPublicApi = ReturnType<typeof createInternalReader>

/**
 * Only expose a subset of reader API in order to protect against
 * wrong manipulation.
 * To access the extended API, create an enhancer.
 */
const withPublicApiOnly = <Api extends { [key in keyof ReaderPublicApi]: any }>(reader: Api) => {
  const {
    context,
    innerPagination,
    manipulateContainer,
    manipulateSpineItems,
    getFocusedSpineItemIndex,
    getCurrentNavigationPosition,
    getSpineItem,
    locator,
    getAbsolutePositionOf,
    generateCfi,
    resolveCfi,
    getCfiMetaInformation,
    ...exposedReader
  } = reader

  return exposedReader
}

type ReaderPublicApiWithSafeExposedKeys = ReturnType<typeof withPublicApiOnly>
type RemovedKeysOnly = keyof Omit<ReaderPublicApi, keyof ReaderPublicApiWithSafeExposedKeys>

const internalEnhancer = composeEnhancer(
  progressionEnhancer
  // @requires progressionEnhancer
  , paginationEnhancer
  , hotkeysEnhancer
  , themeEnhancer
  , navigationEnhancer
  , chromeEnhancer
  , mediaEnhancer
  , zoomEnhancer
  , layoutEnhancer
  , utilsEnhancer
  , resourcesEnhancer
  , accessibilityEnhancer
  , linksEnhancer
  , fontsEnhancer
  , webkitEnhancer
)

type WithoutPrivateApi<E> = Omit<E, RemovedKeysOnly | `__debug` | `__API` | `__OutputSettings`>
type EnhancerOptions<E extends (...args: any) => any> = Parameters<ReturnType<E>>[0]
type EnhancerExposedApi<E extends (...args: any) => any> = ReturnType<ReturnType<E>>

export function createReaderWithEnhancer(options: EnhancerOptions<typeof internalEnhancer>): WithoutPrivateApi<EnhancerExposedApi<typeof internalEnhancer>>
export function createReaderWithEnhancer<UserEnhancer extends Enhancer>(options: EnhancerOptions<UserEnhancer> & EnhancerOptions<typeof internalEnhancer>, enhancer: UserEnhancer): WithoutPrivateApi<EnhancerExposedApi<ComposeEnhancer<typeof internalEnhancer, UserEnhancer>>>
export function createReaderWithEnhancer<UserEnhancer extends Enhancer> (options: EnhancerOptions<UserEnhancer> & EnhancerOptions<typeof internalEnhancer>, enhancer?: UserEnhancer) {
  if (!enhancer) {
    const enhancedCreateReader = internalEnhancer(createInternalReader)

    return withPublicApiOnly(enhancedCreateReader(options))
  }

  const finalEnhancer = composeEnhancer(internalEnhancer, enhancer)
  const enhancedCreateReader = finalEnhancer(createInternalReader)

  return withPublicApiOnly(enhancedCreateReader(options) as any)
}

export type Reader<E extends Enhancer | void = void> = E extends Enhancer
  ? WithoutPrivateApi<EnhancerExposedApi<ComposeEnhancer<typeof internalEnhancer, E>>>
  : WithoutPrivateApi<EnhancerExposedApi<typeof internalEnhancer>>
