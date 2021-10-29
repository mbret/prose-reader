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

type ReaderPublicApi = ReturnType<typeof createInternalReader>

/**
 * Only expose a subset of reader API in order to protect against
 * wrong manipulation.
 * To access the extended API, create an enhancer.
 */
const withPublicApiOnly = <Api extends ReaderPublicApi>(reader: Api) => {
  const {
    context,
    innerPagination,
    manipulateContainer,
    manipulateReadingItems,
    getFocusedReadingItemIndex,
    getCurrentNavigationPosition,
    getReadingItem,
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
  // @requires progressionEnhancer
  paginationEnhancer,
  progressionEnhancer,
  navigationEnhancer,
  linksEnhancer,
  fontsEnhancer,
  themeEnhancer,
  hotkeysEnhancer,
  chromeEnhancer,
  mediaEnhancer,
  zoomEnhancer,
  layoutEnhancer,
  utilsEnhancer,
  resourcesEnhancer,
  accessibilityEnhancer
)

type WithoutPrivateApi<E> = Omit<E, RemovedKeysOnly | `__debug`>

type EnhancerOptions<E extends Enhancer> = Parameters<ReturnType<E>>[0]
type EnhancerExposedApi<E extends Enhancer> = WithoutPrivateApi<ReturnType<ReturnType<E>>>

export function createReaderWithEnhancer(options: EnhancerOptions<typeof internalEnhancer>): WithoutPrivateApi<EnhancerExposedApi<typeof internalEnhancer>>
export function createReaderWithEnhancer<UserEnhancer extends Enhancer>(options: EnhancerOptions<UserEnhancer> & EnhancerOptions<typeof internalEnhancer>, enhancer: UserEnhancer): WithoutPrivateApi<EnhancerExposedApi<ComposeEnhancer<typeof internalEnhancer, UserEnhancer>>>
export function createReaderWithEnhancer<UserEnhancer extends Enhancer> (options: EnhancerOptions<UserEnhancer> & EnhancerOptions<typeof internalEnhancer>, enhancer?: UserEnhancer) {
  if (!enhancer) {
    const enhancedCreateReader = internalEnhancer(createInternalReader)

    return withPublicApiOnly(enhancedCreateReader(options))
  }

  const finalEnhancer = composeEnhancer(internalEnhancer, enhancer)
  const enhancedCreateReader = finalEnhancer(createInternalReader)

  return withPublicApiOnly(enhancedCreateReader(options))
}

export type Reader<E extends Enhancer | void = void> = E extends Enhancer
  ? EnhancerExposedApi<typeof internalEnhancer> & EnhancerExposedApi<E>
  : EnhancerExposedApi<typeof internalEnhancer>
