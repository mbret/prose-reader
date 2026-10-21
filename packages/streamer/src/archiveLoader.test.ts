import type { Archive } from "@prose-reader/archive-reader"
import { catchError, lastValueFrom, of } from "rxjs"
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

describe(`Given a TTL`, () => {
  describe(`and the archive is released right away`, () => {
    it(`should close archive only after timeout`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: 100,
      })

      const { release } = await lastValueFrom(archiveLoader.access(``))

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

      const { release } = await lastValueFrom(archiveLoader.access(``))

      await vitest.advanceTimersByTimeAsync(50)

      expect(closeFnMock).not.toBeCalled()

      release()

      await vitest.advanceTimersByTimeAsync(5)

      expect(closeFnMock).not.toBeCalled()

      await vitest.advanceTimersByTimeAsync(5)

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })

  describe(`and a purge after accessing an archive`, () => {
    it(`should close archive as soon as released`, async () => {
      const closeFnMock = vitest.fn()

      const archiveLoader = createArchiveLoader({
        getArchive: async () => ({ close: closeFnMock }) as unknown as Archive,
        cleanArchiveAfter: 10,
      })

      const { release } = await lastValueFrom(archiveLoader.access(``))

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

      const { release } = await lastValueFrom(archiveLoader.access(``))

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

      const { release } = await lastValueFrom(archiveLoader.access(``))

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

    const result = await lastValueFrom(
      archiveLoader.access(``).pipe(
        catchError((e) => {
          return of(e)
        }),
      ),
    )

    expect(result).toBe(error)
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

      const access = lastValueFrom(archiveLoader.access(`_`))

      // The purge, then the archive.
      await vitest.advanceTimersByTimeAsync(100)

      const { archive, release } = await access

      release()

      expect(archiveLoader._archives._?.state.archive).toEqual(archive)

      expect(closeFnMock).not.toBeCalled()

      await vitest.advanceTimersByTimeAsync(50)

      expect(archiveLoader._archives).toEqual({})

      expect(closeFnMock).toBeCalledTimes(1)
    })
  })
})
