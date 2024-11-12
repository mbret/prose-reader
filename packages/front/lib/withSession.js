export const withSession = (cb) => {
  cb({
    req: {
      session: {}
    },
    res: {}
  })
}