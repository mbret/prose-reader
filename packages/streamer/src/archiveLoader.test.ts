import type { Archive } from "@prose-reader/archive-reader"
import { afterEach, beforeEach, describe, expect, it, vitest } from "vitest"
import { createArchiveLoader } from "./archiveLoader"

/**
 * Time only moves when a test moves it. On real timers, a wait meant to stop
 * short of a TTL runs past it on a busy machine, and the archive is already
 * closed when the test checks that it is not.
 */
beforeEach(() => {
  vitest.useFakeTimers()
})

afterEach(() => {
  vitest.useRealTimers()
})

/**
 * Holds the archive of `key` from now until `release`, the way a reader holds
 * the archive it renders from.
 */
const holdArchive = (
  archiveLoader: ReturnType<typeof createArchiveLoader>,
  key: string,
) => {
  const archive = Promise.withResolvers<Archive>()
  const subscription = archiveLoader.access(key).subscribe({
    next: archive.resolve,
    error: archive.reject,
  })

  return {
    archive: archive.promise,
    release: () => subscription.unsubscribe(),
  }
}

describe(`Given a TTL`, () => {
  describe(`and the archive is released right away`, () => {
    it(`should close archive only after timeout`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: 100,
      })

      const { archive, release } = holdArchive(archiveLoader, ``)

      await archive

      release()

      await vitest.advanceTimersByTimeAsync(50)

      expect(closeFnMock).not.toBeCalled()

      await vitest.advanceTimersByTimeAsync(51)

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })

  describe(`and the archive is release after TTL`, () => {
    it(`should close archive once released on TTL`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: 10,
      })

      const { archive, release } = holdArchive(archiveLoader, ``)

      await archive

      await vitest.advanceTimersByTimeAsync(50)

      expect(closeFnMock).not.toBeCalled()

      release()

      await vitest.advanceTimersByTimeAsync(5)

      expect(closeFnMock).not.toBeCalled()

      await vitest.advanceTimersByTimeAsync(5)

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })

  describe(`and a second hold taken before the first is released`, () => {
    it(`should keep the archive open until both are released`, async () => {
      const closeFnMock = vitest.fn()
      const getArchive = vitest.fn(
        async () => ({ close: closeFnMock }) as unknown as Archive,
      )

      const archiveLoader = createArchiveLoader({
        getArchive,
        cleanArchiveAfter: 10,
      })

      const firstHold = holdArchive(archiveLoader, ``)

      await firstHold.archive

      const secondHold = holdArchive(archiveLoader, ``)

      expect(await secondHold.archive).toBe(await firstHold.archive)

      firstHold.release()

      await vitest.advanceTimersByTimeAsync(50)

      expect(closeFnMock).not.toBeCalled()

      secondHold.release()

      await vitest.advanceTimersByTimeAsync(10)

      expect(closeFnMock).toBeCalledTimes(1)
      expect(getArchive).toHaveBeenCalledTimes(1)
    })
  })

  describe(`and a purge after accessing an archive`, () => {
    it(`should close archive as soon as released`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: 10,
      })

      const { archive, release } = holdArchive(archiveLoader, ``)

      await archive

      archiveLoader.purge()

      await vitest.advanceTimersByTimeAsync(50)

      expect(closeFnMock).not.toBeCalled()

      release()

      expect(archiveLoader._archives).toEqual({})
      expect(closeFnMock).toBeCalledTimes(1)
    })
  })
})

describe(`Given an Infinity TTL`, () => {
  describe(`and a purge after releasing an archive`, () => {
    it(`should close archive as soon as purged`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: Infinity,
      })

      const { archive, release } = holdArchive(archiveLoader, ``)

      await archive

      release()

      expect(closeFnMock).not.toBeCalled()

      archiveLoader.purge()

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })

  describe(`and a purge before releasing an archive`, () => {
    it(`should close archive as soon as released`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: Infinity,
      })

      const { archive, release } = holdArchive(archiveLoader, ``)

      await archive

      expect(closeFnMock).not.toBeCalled()

      archiveLoader.purge()

      release()

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })
})

describe(`Given an archive that rejects`, () => {
  it(`should emit an error`, async () => {
    const error = new Error(`test`)

    const archiveLoader = createArchiveLoader({
      getArchive: async () => {
        throw error
      },
      cleanArchiveAfter: Infinity,
    })

    await expect(holdArchive(archiveLoader, ``).archive).rejects.toBe(error)
    expect(archiveLoader._archives).toEqual({})
  })
})

describe(`Given a long coming archive`, () => {
  describe(`when a purge is triggered before the archive is ready`, async () => {
    it(`should not release the archive as soon as it's released`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))

          return { close: closeFnMock } as unknown as Archive
        },
        cleanArchiveAfter: 10,
      })

      setTimeout(() => {
        archiveLoader.purge()
      }, 50)

      const { archive, release } = holdArchive(archiveLoader, `_`)

      // The purge, then the archive.
      await vitest.advanceTimersByTimeAsync(100)

      const loadedArchive = await archive

      release()

      expect(archiveLoader._archives._?.state.archive).toEqual(loadedArchive)

      expect(closeFnMock).not.toBeCalled()

      await vitest.advanceTimersByTimeAsync(50)

      expect(archiveLoader._archives).toEqual({})

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })

  describe(`when the hold ends before the archive is ready`, () => {
    it(`should close the archive once its TTL runs out after the load`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))

          return { close: closeFnMock } as unknown as Archive
        },
        cleanArchiveAfter: 10,
      })

      holdArchive(archiveLoader, `_`).release()

      await vitest.advanceTimersByTimeAsync(120)

      expect(closeFnMock).toBeCalledTimes(1)
      expect(archiveLoader._archives).toEqual({})
    })
  })
})
