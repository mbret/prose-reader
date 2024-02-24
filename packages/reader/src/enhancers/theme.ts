import { BehaviorSubject, Observable } from "rxjs"
import { takeUntil, tap } from "rxjs/operators"
import { EnhancerOutput, RootEnhancer } from "./types/enhancer"

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

export const themeEnhancer =
  <InheritOptions, InheritOutput extends EnhancerOutput<RootEnhancer>>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions & {
      theme?: Theme
    },
  ): InheritOutput & {
    theme: {
      set: (theme: Theme) => void
      get: () => Theme
      $: {
        theme$: Observable<Theme>
      }
    }
  } => {
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

      return () => {
        // __
      }
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
    reader.spineItems$
      .pipe(
        tap((items) => items.map(({ element }) => applyChangeToSpineItemElement({ container: element }))),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    currentThemeSubject$
      .pipe(
        tap(() => {
          applyChangeToSpineItem()
        }),
        takeUntil(reader.$.destroy$),
      )
      .subscribe()

    return {
      ...reader,
      theme: {
        set: (theme) => {
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
