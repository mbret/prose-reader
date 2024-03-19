export function isDefined<T>(arg: T | null | undefined): arg is T extends null | undefined ? never : T {
  return arg !== null && arg !== undefined
}
