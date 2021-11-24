import { Enhancer, ExtractApi, ExtractHiddenApi, ExtractOptions } from "./types"
import { compose } from "../utils/compose"

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
  O extends Enhancer<any, any, any> = Enhancer,
  > =
  Enhancer<
    & ExtractOptions<A>
    & ExtractOptions<B>
    & ExtractOptions<C>
    & ExtractOptions<D>
    & ExtractOptions<E>
    & ExtractOptions<F>
    & ExtractOptions<G>
    & ExtractOptions<H>
    & ExtractOptions<I>
    & ExtractOptions<J>
    & ExtractOptions<K>
    & ExtractOptions<L>
    & ExtractOptions<M>
    & ExtractOptions<N>
    & ExtractOptions<O>,
    & ExtractHiddenApi<A>
    & ExtractHiddenApi<B>
    & ExtractHiddenApi<C>
    & ExtractHiddenApi<D>
    & ExtractHiddenApi<E>
    & ExtractHiddenApi<F>
    & ExtractHiddenApi<G>
    & ExtractHiddenApi<H>
    & ExtractHiddenApi<I>
    & ExtractHiddenApi<J>
    & ExtractHiddenApi<K>
    & ExtractHiddenApi<L>
    & ExtractHiddenApi<M>
    & ExtractHiddenApi<N>
    & ExtractHiddenApi<O>,
    & Parameters<ExtractApi<A>[`setSettings`]>[0]
    & Parameters<ExtractApi<B>[`setSettings`]>[0]
    & Parameters<ExtractApi<C>[`setSettings`]>[0]
    & Parameters<ExtractApi<D>[`setSettings`]>[0]
    & Parameters<ExtractApi<E>[`setSettings`]>[0]
    & Parameters<ExtractApi<F>[`setSettings`]>[0]
    & Parameters<ExtractApi<G>[`setSettings`]>[0]
    & Parameters<ExtractApi<H>[`setSettings`]>[0]
    & Parameters<ExtractApi<I>[`setSettings`]>[0]
    & Parameters<ExtractApi<J>[`setSettings`]>[0]
    & Parameters<ExtractApi<K>[`setSettings`]>[0]
    & Parameters<ExtractApi<L>[`setSettings`]>[0]
    & Parameters<ExtractApi<M>[`setSettings`]>[0]
    & Parameters<ExtractApi<N>[`setSettings`]>[0]
    & Parameters<ExtractApi<O>[`setSettings`]>[0],
    & ExtractApi<A>[`__OutputSettings`]
    & ExtractApi<B>[`__OutputSettings`]
    & ExtractApi<C>[`__OutputSettings`]
    & ExtractApi<D>[`__OutputSettings`]
    & ExtractApi<E>[`__OutputSettings`]
    & ExtractApi<F>[`__OutputSettings`]
    & ExtractApi<G>[`__OutputSettings`]
    & ExtractApi<H>[`__OutputSettings`]
    & ExtractApi<I>[`__OutputSettings`]
    & ExtractApi<J>[`__OutputSettings`]
    & ExtractApi<K>[`__OutputSettings`]
    & ExtractApi<L>[`__OutputSettings`]
    & ExtractApi<M>[`__OutputSettings`]
    & ExtractApi<N>[`__OutputSettings`]
    & ExtractApi<O>[`__OutputSettings`]
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
export function composeEnhancer<A extends Enhancer<any, any, any>, B extends Enhancer<any, any, any>, C extends Enhancer<any, any, any>, D extends Enhancer<any, any, any>, E extends Enhancer<any, any, any>, F extends Enhancer<any, any, any>, G extends Enhancer<any, any, any>, H extends Enhancer<any, any, any>, I extends Enhancer<any, any, any>, J extends Enhancer<any, any, any>, K extends Enhancer<any, any, any>, L extends Enhancer<any, any, any>, M extends Enhancer<any, any, any>, N extends Enhancer<any, any, any>, O extends Enhancer<any, any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M, n: N, o: O): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M, N, O>
export function composeEnhancer (...funcs: any[]) {
  return compose(...funcs)
}
