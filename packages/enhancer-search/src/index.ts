import { Enhancer } from "@oboku/reader"

/**
 * 
 */
export const searchEnhancer: Enhancer<{

}> = (next) => (options) => {
  const reader = next(options)
  
  return reader
}