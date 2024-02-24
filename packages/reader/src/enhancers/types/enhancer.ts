/* eslint-disable @typescript-eslint/no-explicit-any */
import { createReader } from "../../reader"

export type EnhancerOutput<Enhancer extends (options: any) => any> = ReturnType<ReturnType<Enhancer>>
export type EnhancerOptions<Enhancer extends (options: any) => any> = Parameters<ReturnType<Enhancer>>[0]

const rootEnhancer =
  <Options extends Parameters<typeof createReader>[0], Reader extends ReturnType<typeof createReader>>(
    next: (options: Options) => Reader,
  ) =>
  (options: Options): Reader => {
    const reader = next(options)

    return reader
  }

export type RootEnhancer = typeof rootEnhancer
