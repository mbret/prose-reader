import { Observable, ObservedValueOf } from "rxjs"
import { Reader, CreateReaderOptions } from "../reader"

type AnyObject = Record<string, any>

/** Makes each property optional and turns each leaf property into any, allowing for type overrides by narrowing any. */
type DeepPartialAny<T> = {
  [P in keyof T]?: T[P] extends AnyObject ? DeepPartialAny<T[P]> : any
}

// @todo add observable ? right now they get merged
type Primitive = number | string | ((...args: any) => any)

export type ModifyDeep<A extends AnyObject, B extends DeepPartialAny<A>> = {
  [K in keyof A]-?: B[K] extends never
  ? A[K]
  : B[K] extends Function
  ? B[K]
  : B[K] extends Observable<any>
  ? B[K]
  : B[K] extends AnyObject
  ? ModifyDeep<A[K], B[K]>
  : B[K] extends Primitive ? B[K] : A[K]
} & (A extends AnyObject ? Omit<B, keyof A> : A)

type CreateReader<Options = CreateReaderOptions, Api = Reader> = (options: Options) => Api

type RawEnhancer<Options = CreateReaderOptions, Api = Reader> = (createReader: CreateReader<Options, Api>) => (options: Options) => Api

type DefaultToEmptyObject<A> = A extends AnyObject ? A : {}

export type ExtractOptions<E extends (...args: any) => (options: any) => any> = Parameters<ReturnType<E>>[0]
export type ExtractApi<E extends (...args: any) => (options: any) => any> = ReturnType<ReturnType<E>>
export type ExtractHiddenApi<E extends (...args: any) => (options: any) => any> = DefaultToEmptyObject<NonNullable<ReturnType<ReturnType<E>>[`__API`]>>

export type Enhancer<
  Options = {},
  Api = {},
  Settings = {},
  OutputSettings = Settings,
  DependsOn extends (createReader: any) => (options: any) => any = RawEnhancer,
  Foo extends ExtractApi<DependsOn> = ExtractApi<DependsOn>
  > =
  (
    createReader: (options: ExtractOptions<DependsOn>) =>
      Omit<ReturnType<ReturnType<DependsOn>>, `__API` | `__OutputSettings`>
  ) =>
    (options: ExtractOptions<DependsOn> & Options) =>
      ModifyDeep<
        Omit<Foo, `__API` | `__OutputSettings` | `$`> & {
          $: Omit<Foo[`$`], `settings$`> & {
            /**
             * special case for prose and to automatically merge settings output stream.
             * - add correct type for enhancer dependances
             * - add correct type for the combined final enhancer API
             */
            settings$: Observable<OutputSettings & ObservedValueOf<Foo[`$`][`settings$`]>>
          }
        }, {
          /**
           * special case for prose and to automatically extends settings.
           * - add correct type for enhancer inside setSettings parameter
           * - add correct type for end user using the enhancer
           */
          setSettings: (settings: Parameters<Foo[`setSettings`]>[0] & Settings) => void
        } & Api>
      & { __API?: Api, __OutputSettings?: OutputSettings }
