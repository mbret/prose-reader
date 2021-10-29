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
type InternalReaderCreateParameter = Parameters<typeof createInternalReader>[0]

type Options = InternalReaderCreateParameter & {
  containerElement: HTMLElement,
  // fontScale?: number,
  // lineHeight?: number,
  // fontWeight?: typeof FONT_WEIGHT[number],
  // fontJustification?: typeof FONT_JUSTIFICATION[number],
  // theme?: Theme,
}

type EnhancerCreator<Ext = {}> = (
  options: Options,
) => ReaderPublicApi & Ext

// type Enhancer<Ext = {}, Deps = {}> = (next: EnhancerCreator<Deps>) => EnhancerCreator<Ext>

// function createReader<Ext> (
//   options: InternalReaderCreateParameter,
//   enhancer?: Enhancer<Ext>
// ): ReaderPublicApi & Ext {
//   if (enhancer) return enhancer(createReader)(options) as ReaderPublicApi & Ext

//   const reader = createInternalReader(options)

//   return reader as ReaderPublicApi & Ext
// }

/**
 * Only expose a subset of reader API in order to protect against
 * wrong manipulation.
 * To access the extended API, create an enhancer.
 */
const exposeReader = <Api extends ReaderPublicApi>(reader: Api) => {
  const {
    // __debug,
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

type ReaderPublicApiWithSafeExposedKeys = ReturnType<typeof exposeReader>

type RemovedKeysOnly = Omit<ReaderPublicApi, keyof ReaderPublicApiWithSafeExposedKeys>

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

type InternalEnhancer = ReturnType<typeof internalEnhancer>

/**
 * Here we can remove internal enhancer API from use on
 * `reader.`.
 * Use this in order to prevent enhancer to be leaked for general basic API uses. This will not
 * remove the enhancer from being used within other enhancer. This is useful if the enhancer augment the reader
 * with not basic API and want to protect the user.
 * It can also be used to protect experimental or private API meant to be shared between internal enhancers.
 */
type InternalEnhancerApi = Omit<ReturnType<InternalEnhancer>, `progression`>

// export function createReaderWithEnhancers(options: Options): Omit<InternalEnhancerApi, keyof RemovedKeysOnly>
// export function createReaderWithEnhancers<Ext = {}>(options: Options, enhancer?: Enhancer<Ext>): Omit<InternalEnhancerApi & Ext, keyof RemovedKeysOnly>
// export function createReaderWithEnhancers<Ext = {}> (options: Options, enhancer?: Enhancer<Ext>) {
//   if (enhancer) {
//     return exposeReader(createReader(options, composeEnhancer(
//       enhancer,
//       internalEnhancer
//     )))
//   } else {
//     return exposeReader(createReader(options, internalEnhancer))
//   }
// }

type ExtractGenericApi<Type> = Type extends Enhancer<any, infer X> ? X : never
type ExtractGenericOptions<Type> = Type extends Enhancer<infer X> ? X : never
type EnhancerOptions<E extends Enhancer> = Parameters<ReturnType<E>>[0]
type EnhancerApi<E extends Enhancer> = ReturnType<ReturnType<E>>

type ReaderPublicApiWithEnhancer = EnhancerApi<typeof internalEnhancer>
type ReaderPublicOptionsWithEnhancer = EnhancerOptions<typeof internalEnhancer>

// type RootEnhancer<R extends ReaderPublicApiWithEnhancer, O extends ReaderPublicOptionsWithEnhancer> = (_createReader: typeof createReader) => (options: O) => R

export function createReaderWithEnhancer(options: EnhancerOptions<typeof internalEnhancer>): EnhancerApi<typeof internalEnhancer>
export function createReaderWithEnhancer<UserEnhancer extends Enhancer>(options: EnhancerOptions<UserEnhancer> & EnhancerOptions<typeof internalEnhancer>, enhancer: UserEnhancer): EnhancerApi<ComposeEnhancer<typeof internalEnhancer, UserEnhancer>>
export function createReaderWithEnhancer<UserEnhancer extends Enhancer>(options: EnhancerOptions<UserEnhancer> & EnhancerOptions<typeof internalEnhancer>, enhancer?: UserEnhancer) {
  if (!enhancer) {
    const enhancedCreateReader = internalEnhancer(createInternalReader)

    return enhancedCreateReader(options)
  }

  const finalEnhancer = composeEnhancer(internalEnhancer, enhancer)
  const enhancedCreateReader = finalEnhancer(createInternalReader)

  return enhancedCreateReader(options)
}

// export type Reader<E extends any = void> = EnhancerApi<typeof internalEnhancer>
// export type Reader = EnhancerApi<typeof internalEnhancer>
export type Reader<E extends Enhancer | void = void> = E extends Enhancer
  ? EnhancerApi<typeof internalEnhancer> & EnhancerApi<E>
  : EnhancerApi<typeof internalEnhancer>

const s = createReaderWithEnhancer({
  containerElement: document.body,
  fontScale: 0
})

// s.boo
// s.$.links$
// s.pagination
// s.getFontWeight()

// type as = Reader['pa']
// export type ReaderWithEnhancer<E extends Enhancer<any>> = ReturnType<typeof createInternalReader>
// export type ReaderWithEnhancer<E extends Enhancer> =
//   EnhancerApi<ComposeEnhancer<typeof internalEnhancer, E>>

// const sd = (r: Reader) => {
//   r.pagi
// }
