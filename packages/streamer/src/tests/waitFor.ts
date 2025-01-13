export const waitFor = (timer: number) =>
  new Promise((resolve) => setTimeout(resolve, timer))
