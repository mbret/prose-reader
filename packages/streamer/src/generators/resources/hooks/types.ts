export type HookResource = {
  body?: string
  params: {
    headers?: Record<string, string>
    status: number
  }
}
