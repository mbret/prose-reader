import { Enhancer, ReaderInternalApi } from "./types"
import { compose } from "../utils/compose"

// @important to not nuke the performances
type KeyOfReaderInternalApi = Exclude<keyof ReaderInternalApi, `$`>
export type EnhancerExtraMethods<E extends Enhancer> = Omit<ReturnType<ReturnType<E>>, KeyOfReaderInternalApi>

type EnhancerExtraOptions<E extends Enhancer> = Parameters<ReturnType<E>>[0]

export type ComposeEnhancer<
  A extends Enhancer<any, any, any> = Enhancer,
  B extends Enhancer<any, any, any> = Enhancer,
  C extends Enhancer<any, any, any> = Enhancer,
  D extends Enhancer<any, any, any> = Enhancer,
  E extends Enhancer<any, any, any> = Enhancer,
  F extends Enhancer<any, any, any> = Enhancer,
  G extends Enhancer<any, any, any> = Enhancer,
  H extends Enhancer<any, any, any> = Enhancer,
  I extends Enhancer<any, any, any> = Enhancer,
  J extends Enhancer<any, any, any> = Enhancer,
  K extends Enhancer<any, any, any> = Enhancer,
  L extends Enhancer<any, any, any> = Enhancer,
  M extends Enhancer<any, any, any> = Enhancer,
  N extends Enhancer<any, any, any> = Enhancer,
  > =
  Enhancer<
    & EnhancerExtraOptions<A>
    & EnhancerExtraOptions<B>
    & EnhancerExtraOptions<C>
    & EnhancerExtraOptions<D>
    & EnhancerExtraOptions<E>
    & EnhancerExtraOptions<F>
    & EnhancerExtraOptions<G>
    & EnhancerExtraOptions<H>
    & EnhancerExtraOptions<I>
    & EnhancerExtraOptions<J>
    & EnhancerExtraOptions<K>
    & EnhancerExtraOptions<L>
    & EnhancerExtraOptions<M>
    & EnhancerExtraOptions<N>,
    & EnhancerExtraMethods<A>
    & EnhancerExtraMethods<B>
    & EnhancerExtraMethods<C>
    & EnhancerExtraMethods<D>
    & EnhancerExtraMethods<E>
    & EnhancerExtraMethods<F>
    & EnhancerExtraMethods<G>
    & EnhancerExtraMethods<H>
    & EnhancerExtraMethods<I>
    & EnhancerExtraMethods<J>
    & EnhancerExtraMethods<K>
    & EnhancerExtraMethods<L>
    & EnhancerExtraMethods<M>
    & EnhancerExtraMethods<N>
  >

export function composeEnhancer<A extends Enhancer<any, any, any>>(a: A): ComposeEnhancer<A>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>>(a: A, b: B): ComposeEnhancer<A, B>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>>(a: A, b: B, c: C): ComposeEnhancer<A, B, C>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D): ComposeEnhancer<A, B, C, D>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E): ComposeEnhancer<A, B, C, D, E>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F): ComposeEnhancer<A, B, C, D, E, F>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ComposeEnhancer<A, B, C, D, E, F, G>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): ComposeEnhancer<A, B, C, D, E, F, G, H>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): ComposeEnhancer<A, B, C, D, E, F, G, H, I>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>, J extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>, J extends Enhancer<any, any, any>, K extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>, J extends Enhancer<any, any, any>, K extends Enhancer<any, any, any>, L extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>, J extends Enhancer<any, any, any>, K extends Enhancer<any, any, any>, L extends Enhancer<any, any, any>, M extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M>
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>, J extends Enhancer<any, any, any>, K extends Enhancer<any, any, any>, L extends Enhancer<any, any, any>, M extends Enhancer<any, any, any>, N extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M, n: N): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M, N>
export function composeEnhancer (...funcs: any[]) {
  return compose(...funcs)
}
