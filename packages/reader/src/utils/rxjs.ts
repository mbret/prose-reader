import { OperatorFunction } from "rxjs"
import { map } from "rxjs/operators"

export const mapKeysTo = <R extends { [key: string]: any }, K extends keyof R>(keys: K[]): OperatorFunction<R, Pick<R, K>> => {
  return map((obj) => {
    return Object.entries(obj).reduce((acc, [key, entry]) => {
      if (keys.includes(key as any)) {
        return {
          ...acc,
          [key]: entry
        }
      }

      return acc
    }, {} as Pick<typeof obj, K>)
  })
}
