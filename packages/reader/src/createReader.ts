import { chromeEnhancer } from './enhancers/chrome'
import { fontsEnhancer, FONT_JUSTIFICATION, FONT_WEIGHT } from './enhancers/fonts'
import { hotkeysEnhancer } from './enhancers/hotkeys'
import { layoutEnhancer } from './enhancers/layout'
import { linksEnhancer } from './enhancers/links'
import { navigationEnhancer } from './enhancers/navigation'
import { paginationEnhancer } from './enhancers/pagination'
import { Theme, themeEnhancer } from './enhancers/theme'
import { composeEnhancer } from './utils/composeEnhancer'
import { zoomEnhancer } from './enhancers/zoom'
import { createReader as createInternalReader } from './reader'
import { utilsEnhancer } from './enhancers/utils'
import { resourcesEnhancer } from './enhancers/resources'
import { mediaEnhancer } from './enhancers/media'

type ReaderPublicApi = ReturnType<typeof createInternalReader>

type InternalReaderCreateParameter = Parameters<typeof createInternalReader>[0]

export type Enhancer<Ext = {}> = (next: EnhancerCreator<Ext>) => EnhancerCreator<Ext>

type Options = InternalReaderCreateParameter & {
  containerElement: HTMLElement,
  fontScale?: number,
  lineHeight?: number,
  fontWeight?: typeof FONT_WEIGHT[number],
  fontJustification?: typeof FONT_JUSTIFICATION[number],
  theme?: Theme,
}

type EnhancerCreator<Ext = {}> = (
  options: Options,
) => ReaderPublicApi & Ext

function createReader<Ext>(
  options: InternalReaderCreateParameter,
  enhancer?: Enhancer<Ext>
): ReaderPublicApi & Ext {
  if (enhancer) return enhancer(createReader)(options) as ReaderPublicApi & Ext

  const reader = createInternalReader(options)

  return reader as ReaderPublicApi & Ext
}

/**
 * Only expose a subset of reader API in order to protect against
 * wrong manipulation.
 * To access the extended API, create an enhancer.
 */
const exposeReader = <Api extends ReaderPublicApi>(reader: Api) => {
  const {
    context,
    pagination,
    manipulateContainer,
    manipulateReadingItems,
    getFocusedReadingItemIndex,
    getCurrentNavigationPosition,
    getReadingItem,
    locator,
    ...exposedReader
  } = reader

  return exposedReader
}

type ExposedReader = ReturnType<typeof exposeReader>

type RemovedKeys = Omit<ReaderPublicApi, keyof ExposedReader>

const internalEnhancer = composeEnhancer(
  paginationEnhancer,
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
)

type InternalEnhancer = ReturnType<typeof internalEnhancer>

export function createReaderWithEnhancers(options: Options): Omit<ReturnType<InternalEnhancer>, keyof RemovedKeys>
export function createReaderWithEnhancers<Ext = {}>(options: Options, enhancer?: Enhancer<Ext>): Omit<ReturnType<InternalEnhancer> & Ext, keyof RemovedKeys>
export function createReaderWithEnhancers<Ext = {}>(options: Options, enhancer?: Enhancer<Ext>) {
  if (enhancer) {
    return exposeReader(createReader(options, composeEnhancer(
      enhancer,
      internalEnhancer,
    )))
  } else {
    return exposeReader(createReader(options, internalEnhancer))
  }
}

// export type ReaderWithEnhancer<E extends Enhancer<any>> = ReturnType<typeof createInternalReader>
export type ReaderWithEnhancer<E extends Enhancer<any>> =
  Omit<
    ReturnType<typeof createReaderWithEnhancers>
    & ReturnType<ReturnType<E>>,
    keyof RemovedKeys
  >