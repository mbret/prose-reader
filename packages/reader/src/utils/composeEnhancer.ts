import { Enhancer } from "../createReader"
import compose from "../utils/compose"

export type ComposeEnhancer<
  A extends Enhancer<any, any> = Enhancer<{}>,
  B extends Enhancer<any, any> = Enhancer<{}>,
  C extends Enhancer<any, any> = Enhancer<{}>,
  D extends Enhancer<any, any> = Enhancer<{}>,
  E extends Enhancer<any, any> = Enhancer<{}>,
  F extends Enhancer<any, any> = Enhancer<{}>,
  G extends Enhancer<any, any> = Enhancer<{}>,
  H extends Enhancer<any, any> = Enhancer<{}>,
  I extends Enhancer<any, any> = Enhancer<{}>,
  J extends Enhancer<any, any> = Enhancer<{}>,
  K extends Enhancer<any, any> = Enhancer<{}>,
  L extends Enhancer<any, any> = Enhancer<{}>,
  M extends Enhancer<any, any> = Enhancer<{}>,
  N extends Enhancer<any, any> = Enhancer<{}>,
  > =
  Enhancer<
    & ReturnType<ReturnType<A>>
    & ReturnType<ReturnType<B>>
    & ReturnType<ReturnType<C>>
    & ReturnType<ReturnType<D>>
    & ReturnType<ReturnType<E>>
    & ReturnType<ReturnType<F>>
    & ReturnType<ReturnType<G>>
    & ReturnType<ReturnType<H>>
    & ReturnType<ReturnType<I>>
    & ReturnType<ReturnType<J>>
    & ReturnType<ReturnType<K>>
    & ReturnType<ReturnType<L>>
    & ReturnType<ReturnType<M>>
    & ReturnType<ReturnType<N>>
  >

export function composeEnhancer<A extends Enhancer<any, any>>(a: A): ComposeEnhancer<A>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>>(a: A, b: B): ComposeEnhancer<A, B>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>>(a: A, b: B, c: C): ComposeEnhancer<A, B, C>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>>(a: A, b: B, c: C, D: D): ComposeEnhancer<A, B, C, D>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E): ComposeEnhancer<A, B, C, D, E>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F): ComposeEnhancer<A, B, C, D, E, F>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ComposeEnhancer<A, B, C, D, E, F, G>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): ComposeEnhancer<A, B, C, D, E, F, G, H>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>, I extends Enhancer<any, any>, >(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): ComposeEnhancer<A, B, C, D, E, F, G, H, I>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>, I extends Enhancer<any, any>, J extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>, I extends Enhancer<any, any>, J extends Enhancer<any, any>, K extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>, I extends Enhancer<any, any>, J extends Enhancer<any, any>, K extends Enhancer<any, any>, L extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>, I extends Enhancer<any, any>, J extends Enhancer<any, any>, K extends Enhancer<any, any>, L extends Enhancer<any, any>, M extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M>
export function composeEnhancer<A extends Enhancer<any, any>, B extends Enhancer<any, any>, C extends Enhancer<any, any>, D extends Enhancer<any, any>, E extends Enhancer<any, any>, F extends Enhancer<any, any>, G extends Enhancer<any, any>, H extends Enhancer<any, any>, I extends Enhancer<any, any>, J extends Enhancer<any, any>, K extends Enhancer<any, any>, L extends Enhancer<any, any>, M extends Enhancer<any, any>, N extends Enhancer<any, any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M, n: N): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K, L, M, N>
export function composeEnhancer (...funcs: any[]) {
  return compose(...funcs)
}
