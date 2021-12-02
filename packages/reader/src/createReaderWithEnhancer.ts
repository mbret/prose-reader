import { chromeEnhancer } from './enhancers/chrome'
import { fontsEnhancer } from './enhancers/fonts'
import { hotkeysEnhancer } from './enhancers/hotkeys'
import { layoutEnhancer } from './enhancers/layoutEnhancer/layoutEnhancer'
import { linksEnhancer } from './enhancers/links'
import { navigationEnhancer } from './enhancers/navigation'
import { paginationEnhancer } from './enhancers/pagination'
import { themeEnhancer } from './enhancers/theme'
import { ComposableEnhancer, ComposeEnhancer, composeEnhancer } from './enhancers/composeEnhancer'
import { Enhancer } from './enhancers/types'
import { zoomEnhancer } from './enhancers/zoom'
import { createReader as createInternalReader, Reader as ReaderPublicApi } from './reader'
import { utilsEnhancer } from './enhancers/utils'
import { resourcesEnhancer } from './enhancers/resources'
import { mediaEnhancer } from './enhancers/media'
import { progressionEnhancer } from './enhancers/progression'
import { accessibilityEnhancer } from './enhancers/accessibility'
import { webkitEnhancer } from './enhancers/webkit'

/**
 * Only expose a subset of reader API in order to protect against
 * wrong manipulation.
 * To access the extended API, create an enhancer.
 */
const withPublicApiOnly = <Api extends { [key in keyof ReaderPublicApi]: any }>(reader: Api) => {
  const {
    context,
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
    spine,
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

type CoreEnhancer = typeof internalEnhancer

export type CoreEnhancerDependsOn = (createReader: Parameters<CoreEnhancer>[0]) => (options: EnhancerOptions<CoreEnhancer>) => EnhancerExposedApi<CoreEnhancer>

export type ExternalEnhancer<
  Options = {},
  Api = {},
  Settings = {},
  OutputSettings = Settings,
  DependsOn extends (createReader: any) => (options: any) => any = CoreEnhancerDependsOn
  > = Enhancer<
    Options,
    Api,
    Settings,
    OutputSettings,
    DependsOn
  >

export function createReaderWithEnhancer(
  options: EnhancerOptions<CoreEnhancer>
): WithoutPrivateApi<EnhancerExposedApi<CoreEnhancer>>

export function createReaderWithEnhancer<UserEnhancer extends ComposableEnhancer>(
  options: EnhancerOptions<UserEnhancer> & EnhancerOptions<CoreEnhancer>,
  enhancer: UserEnhancer
): WithoutPrivateApi<EnhancerExposedApi<ComposeEnhancer<typeof internalEnhancer, UserEnhancer>>>

export function createReaderWithEnhancer<UserEnhancer extends ComposableEnhancer> (
  options: EnhancerOptions<UserEnhancer> & EnhancerOptions<CoreEnhancer>,
  enhancer?: UserEnhancer
) {
  if (!enhancer) {
    const enhancedCreateReader = internalEnhancer(createInternalReader)

    return withPublicApiOnly(enhancedCreateReader(options))
  }

  const finalEnhancer = composeEnhancer(internalEnhancer, enhancer)
  const enhancedCreateReader = finalEnhancer(createInternalReader)

  return withPublicApiOnly(enhancedCreateReader(options))
}

export type Reader<E extends ComposableEnhancer | void = void> = E extends ComposableEnhancer
  ? WithoutPrivateApi<EnhancerExposedApi<ComposeEnhancer<CoreEnhancer, E>>>
  : WithoutPrivateApi<EnhancerExposedApi<CoreEnhancer>>
