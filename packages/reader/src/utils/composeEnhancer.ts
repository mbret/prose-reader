import { Enhancer } from "../createReader";
import compose from "../utils/compose";

export type ComposeEnhancer<
  A extends Enhancer<any> = Enhancer<{}>,
  B extends Enhancer<any> = Enhancer<{}>,
  C extends Enhancer<any> = Enhancer<{}>,
  D extends Enhancer<any> = Enhancer<{}>,
  E extends Enhancer<any> = Enhancer<{}>,
  F extends Enhancer<any> = Enhancer<{}>,
  G extends Enhancer<any> = Enhancer<{}>,
  H extends Enhancer<any> = Enhancer<{}>,
  I extends Enhancer<any> = Enhancer<{}>,
  J extends Enhancer<any> = Enhancer<{}>,
  K extends Enhancer<any> = Enhancer<{}>,
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
  >

export function composeEnhancer<A extends Enhancer<any>>(a: A): ComposeEnhancer<A>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>>(a: A, b: B): ComposeEnhancer<A, B>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>>(a: A, b: B, c: C): ComposeEnhancer<A, B, C>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>>(a: A, b: B, c: C, D: D): ComposeEnhancer<A, B, C, D>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E): ComposeEnhancer<A, B, C, D, E>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F): ComposeEnhancer<A, B, C, D, E, F>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>, G extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): ComposeEnhancer<A, B, C, D, E, F, G>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>, G extends Enhancer<any>, H extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): ComposeEnhancer<A, B, C, D, E, F, G, H>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>, G extends Enhancer<any>, H extends Enhancer<any>, I extends Enhancer<any>, >(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): ComposeEnhancer<A, B, C, D, E, F, G, H, I>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>, G extends Enhancer<any>, H extends Enhancer<any>, I extends Enhancer<any>, J extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J>
export function composeEnhancer<A extends Enhancer<any>, B extends Enhancer<any>, C extends Enhancer<any>, D extends Enhancer<any>, E extends Enhancer<any>, F extends Enhancer<any>, G extends Enhancer<any>, H extends Enhancer<any>, I extends Enhancer<any>, J extends Enhancer<any>, K extends Enhancer<any>>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K): ComposeEnhancer<A, B, C, D, E, F, G, H, I, J, K>
export function composeEnhancer(...funcs: any[]) {
  return compose(...funcs)
}