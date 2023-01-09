import { BehaviorSubject, Observable } from "rxjs"
import { takeUntil, tap } from "rxjs/operators"
import { Enhancer } from "./types"

const defaultThemes = [
  {
    name: `bright` as const,
    backgroundColor: `white`,
  },
  {
    name: `sepia` as const,
    backgroundColor: `#eaddc7`,
    foregroundColor: `black`,
  },
  {
    name: `night` as const,
    backgroundColor: `#191717`,
    foregroundColor: `#f1ebeb`,
  },
]

export type Theme = (typeof defaultThemes)[number][`name`] | `publisher`

export const themeEnhancer: Enhancer<
  {
    theme?: Theme
  },
  {
    theme: {
      set: (theme: Theme) => void
      get: () => Theme
      $: {
        theme$: Observable<Theme>
      }
    }
  }
> = (next) => (options) => {
  const { theme } = options
  const reader = next(options)
  const currentThemeSubject$ = new BehaviorSubject<Theme>(options.theme ?? `bright`)

  const getStyle = () => {
    const foundTheme = defaultThemes.find((entry) => entry.name === currentThemeSubject$.value)

    return `
      body {
        ${foundTheme !== undefined ? `background-color: ${foundTheme.backgroundColor} !important;` : ``}
      }
      ${
        foundTheme?.foregroundColor
          ? `
          body * {
            ${
              /*
              Ideally, we would like to use !important but it could break publisher specific
              cases
            */ ``
            }
            color: ${foundTheme.foregroundColor};
          }
        `
          : ``
      }
    `
  }

  const applyChangeToSpineItemElement = ({ container }: { container: HTMLElement }) => {
    const foundTheme = defaultThemes.find((entry) => entry.name === currentThemeSubject$.value)
    if (foundTheme) {
      container.style.setProperty(`background-color`, foundTheme.backgroundColor)
    }

    return () => {}
  }

  const applyChangeToSpineItem = () => {
    reader.manipulateSpineItems(({ removeStyle, addStyle, container }) => {
      removeStyle(`prose-reader-theme`)
      addStyle(`prose-reader-theme`, getStyle())
      applyChangeToSpineItemElement({ container })

      return false
    })
  }

  /**
   * Make sure to apply theme on item load
   */
  reader.registerHook(`item.onLoad`, ({ removeStyle, addStyle }) => {
    removeStyle(`prose-reader-theme`)
    addStyle(`prose-reader-theme`, getStyle())
  })

  /**
   * Make sure to apply theme on item container (fixed layout)
   * & loading element
   */
  reader.$.itemsCreated$
    .pipe(
      tap((items) => items.map(({ element }) => applyChangeToSpineItemElement({ container: element }))),
      takeUntil(reader.$.destroy$)
    )
    .subscribe()

  currentThemeSubject$
    .pipe(
      tap(() => {
        applyChangeToSpineItem()
      }),
      takeUntil(reader.$.destroy$)
    )
    .subscribe()

  return {
    ...reader,
    theme: {
      set: (theme: Theme) => {
        if (theme !== currentThemeSubject$.value) {
          currentThemeSubject$.next(theme)
        }
      },
      get: () => currentThemeSubject$.value,
      $: {
        theme$: currentThemeSubject$.asObservable(),
      },
    },
  }
}
