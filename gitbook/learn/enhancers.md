# Enhancers

Enhancers are the official and conventional way of adding functionalities to the reader. prose reader core tries to stay agnostic and focus on the minimum support of books. Things like bookmarks, highlighting, gesture navigation etc are not part of the core. That's when enhancers come into play.

## Existing enhancers

### Official enhancers

There are already several official enhancers which cover common use cases (bookmark, gesture, search, etc). Before trying to make your own take a look to see if it does not already exist. The list is available in the packages section of the documentation.

Example:

```typescript
import { createReader } from "@prose-reader/core"
import { bookmarksEnhancer } from "@prose-reader/enhancer-bookmarks"
import { searchEnhancer } from "@prose-reader/enhancer-search"
import { annotationsEnhancer } from "@prose-reader/enhancer-annotations"

const reader = annotationsEnhancer(
  bookmarksEnhancer(
    searchEnhancer(
      createReader
    )
  )
)

// enhancers have usually their own namespace by convention
reader.bookmarks.load(...)
```

### Paid enhancers

As of right now there are no paid enhancers but we might consider looking into it to help cover the cost of development of prose. If we ever want to do so, we will try to not create essential paid enhancers. We want the community to be able to produce high quality products without necessarily having to pay.

### Community enhancers

{% hint style="info" %}
If you want your enhancers to be referenced here, contact us and we will update the list.
{% endhint %}

## Writing your own enhancer

An enhancer is simply a higher order function which takes a reader creator and returns its result.

The entire point of doing this is to be able to compose them, alter the reader creation and have dependency injection if needed. It is also a good way to keep consistency with the community.

### Minimal implementation

```typescript
export const myEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    return reader
  }

// end user wrap its createReader with your enhancer
const createAppReader = myEnhancer(createReader)

const reader = createAppReader({})
```

This enhancer follows the minimal configuration to be functional. It is however pretty useless in this state.

By the way here is how the user can use more than one enhancer:

```typescript
const createAppReader = enhancerA(
  enhancerB(
    enhancerC(
      createReader
    )
  )
)
```

Due to limitation in typescript heap size and complexity we cannot simplify the combination with something like:

```typescript
const withEnhancer = compose(enhancerA, enhancerB, enhancerC)
const createAppReader = withEnhancer(createReader)
```

Writing a compose function is challenging for this type of enhancers.

Anyway, let's now add some features to our enhancer

### Add functionalities to the reader

We want our enhancer to deal with the links being clicked in the book. This is not something natively implemented by prose since it's specific to how the end user wants to react.

Let's say we want to show a confirm dialog to the user and if they confirm we navigate them to the link:

```typescript
type CreateReader = typeof createReader
type CreateReaderOptions = Parameters<CreateReader>[0]
type ReaderOutput = ReturnType<CreateReader>

export const myEnhancer =
  <InheritOptions extends CreateReaderOptions, InheritOutput extends ReaderOutput>(next: (options: InheritOptions) => InheritOutput) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    reader.$.links$
      .pipe(
        // we don't forget to unsubscribe
        // reader.$.destroy$ is a good way stop.
        // It signifies the final destruction of the reader instance
        takeUntil(reader.$.destroy$),
      )
      .subscribe((event) => {
        if (event.event === "linkClicked") {
          // not related to book navigation
          if (!event.isNavigable) {
            const response = confirm(`You are going to be redirected to external link`)

            if (response) {
              window.open(event.data.href, "__blank")
            }
          }
        }
      })

    return reader
  }
```

For now it's pretty basic but we have an active subscription to the links being clicked and we unsubscribe at the right moment.

Now let's add an option to our enhancer to let the user customize the confirm message:

```typescript
type CreateReader = typeof createReader
type CreateReaderOptions = Parameters<CreateReader>[0]
type ReaderOutput = ReturnType<CreateReader>

export const myEnhancer =
  <InheritOptions extends CreateReaderOptions, InheritOutput extends ReaderOutput>(next: (options: InheritOptions) => InheritOutput) =>
  (
    options: InheritOptions & {
      myEnhancer: {
        confirmMessage: string
      }
    },
  ): InheritOutput => {
    const {
      myEnhancer: { confirmMessage },
    } = options
    const reader = next(options)

    reader.$.links$
      .pipe(
        // we don't forget to unsubscribe
        // reader.$.destroy$ is a good way stop.
        // It signifies the final destruction of the reader instance
        takeUntil(reader.$.destroy$),
      )
      .subscribe((event) => {
        if (event.event === "linkClicked") {
          if (!event.isNavigable) {
            const response = confirm(confirmMessage)

            if (response) {
              window.open(event.data.href, "__blank")
            }
          }
        }
      })

    return reader
  }

const createAppReader = myEnhancer(createReader)

const reader = createAppReader({
  myEnhancer: {
    confirmMessage: `You are going to be redirected to external link`,
  },
})
```

We extended the type of `options` to allow some customization. We then simply have to get it from the `options` passed to our enhancer.

{% hint style="info" %}
Note how we are using `myEnhancer` as namespace. This is recommended to wrap your enhancer functionalities within a namespace to prevent conflict between enhancers and make update easier for users.
{% endhint %}

It's nice but what if the user wants to change the message later and after the reader is created ? Maybe because the language changed or else. Right now our options are static and can only be passed on creation.

Let's add a function to let user change the confirm message dynamically:

```typescript
type CreateReader = typeof createReader
type CreateReaderOptions = Parameters<CreateReader>[0]
type ReaderOutput = ReturnType<CreateReader>

export const myEnhancer =
  <
    NextReader extends ReaderOutput,
    NextOptions extends CreateReaderOptions,
    InheritOptions extends NextOptions & {
      myEnhancer: {
        confirmMessage: string
      }
    },
    InheritOutput extends NextReader & {
      myEnhancer: {
        setConfirmMessage: (message: string) => void
      }
    },
  >(
    next: (options: NextOptions) => NextReader,
  ) =>
  (options: InheritOptions): InheritOutput => {
    let {
      myEnhancer: { confirmMessage },
    } = options
    const reader = next(options)

    reader.$.links$
      .pipe(
        // we don't forget to unsubscribe
        // reader.$.destroy$ is a good way stop.
        // It signifies the final destruction of the reader instance
        takeUntil(reader.$.destroy$),
      )
      .subscribe((event) => {
        if (event.event === "linkClicked") {
          if (!event.isNavigable) {
            const response = confirm(confirmMessage)

            if (response) {
              window.open(event.data.href, "__blank")
            }
          }
        }
      })

    return {
      ...reader,
      myEnhancer: {
        setConfirmMessage: (newMessage) => {
          confirmMessage = newMessage
        },
      },
    } as InheritOutput
  }

const createAppReader = myEnhancer(createReader)

const reader = createAppReader({
  myEnhancer: {
    confirmMessage: `You are going to be redirected to external link`,
  },
})

reader.myEnhancer.setConfirmMessage(`My new message`)
```

Here we added new typing on the output of our enhancer and implemented a new function to update our message.&#x20;

This may not seem like much but we already know how to:

* alter creation options
* add feature by reacting to reader events
* alter reader API

The final piece is how to make an enhancer that requires another enhancer. For the sake of simplicity let's stay with our current example of link interaction. Let's split our enhancer into two. The first enhancer will provide a confirm dialog, the second will redirect the link and use the first one to display the dialog. It does not make much sense but the exercise is about enhancer dependencies.

{% hint style="info" %}
Composing enhancer types and having dependencies is the hardest part. We are looking for help to simplify the process. If you have an idea to make it a smoother experience please contact us.
{% endhint %}

Due to the complexity we will need to decompose our types a bit more and use some unfortunate escape hatches. The escape hatches are within the enhancer itself, we provide a valid typescript enhancer definition for the end user.

```typescript
type CreateReader = typeof createReader
type CreateReaderOptions = Parameters<CreateReader>[0]
type ReaderOutput = ReturnType<CreateReader>

export const dialogEnhancer =
  <
    InheritOptions extends CreateReaderOptions & {
      dialog: {
        confirmMessage: string
      }
    },
    NextReader extends ReaderOutput,
    InheritOutput extends NextReader & {
      dialog: {
        confirm: (message: string) => boolean
      }
    },
  >(
    next: (options: InheritOptions) => NextReader,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    const dialogConfirm = (message: string) => confirm(message)

    return {
      ...reader,
      dialog: {
        confirm: dialogConfirm,
      },
      // We unfortunately have a subset casting problem
      // NextReader (reader) cannot be assigned to InheritOutput
      // Even tho NextReader follow InheritOutput constraint
      // InheritOutput could have a different set of constraint on its own
    } as InheritOutput
  }

type DialogEnhancerOptions = Parameters<ReturnType<typeof dialogEnhancer>>[0]
type DialogEnhancerOutput = ReturnType<ReturnType<typeof dialogEnhancer>>

export const linkEnhancer =
  <
    InheritOptions extends DialogEnhancerOptions,
    InheritOutput extends DialogEnhancerOutput,
  >(
    next: (options: InheritOptions) => DialogEnhancerOutput,
  ) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    reader.$.links$.pipe(takeUntil(reader.$.destroy$)).subscribe((event) => {
      if (event.event === "linkClicked") {
        if (!event.isNavigable) {
          const response = reader.dialog.confirm(options.dialog.confirmMessage)

          if (response) {
            window.open(event.data.href, "__blank")
          }
        }
      }
    })

    // Again, we have a problem of subset casting
    // It's not safe but it's the best way to deal with
    // it afaik
    return reader as InheritOutput
  }

// the order is important, you will get a typescript error if you
// make a mistake
const createAppReader = linkEnhancer(dialogEnhancer(createReader))

const reader = createAppReader({
  dialog: {
    confirmMessage: `Do you want to continue with this link?`,
  },
})
```

Regarding this part, you are free to use a different strategy, especially if it feels cleaner to you. As long as your enhancer is correctly typed for end user, you are free to change the way you deal with dependencies.

### Custom CSS in enhancers

To learn how to efficiently handle CSS with your enhancers, you can visit the [style-and-css.md](style-and-css.md "mention") section.

## What if I don't want to follow enhancers best practice?

You can very much do whatever you want and distribute a package that adds features to prose. You don't need to follow the enhancers convention. However it might make its use confusing for the end user and will create extra friction.

Here is an example of how to do things differently:

We are creating a "plugin" which handles click on links and redirect the user after confirmation. This will work and is rather simple to use.

```typescript
export const linkHandlerPlugin = (reader: Reader) => {
  const sub = reader.$.links$.pipe().subscribe((event) => {
    if (event.event === "linkClicked") {
      if (!event.isNavigable) {
        const response = confirm(`You are going to be redirected to external link`)

        if (response) {
          window.open(event.data.href, "__blank")
        }
      }
    }
  })

  return () => {
    sub.unsubscribe()
  }
}
```

Now its alternative with enhancer convention:

```typescript
export const linkHandlerEnhancer =
  <InheritOptions, InheritOutput extends Reader>(next: (options: InheritOptions) => InheritOutput) =>
  (options: InheritOptions): InheritOutput => {
    const reader = next(options)

    reader.$.links$.pipe(takeUntil(reader.$.destroy$)).subscribe((event) => {
      if (event.event === "linkClicked") {
        if (!event.isNavigable) {
          const response = confirm(`You are going to be redirected to external link`)

          if (response) {
            window.open(event.data.href, "__blank")
          }
        }
      }
    })

    return reader
  }
```

The enhancer version has more initial boilerplate, especially due to the generic types but this is essential for more complex enhancers which alter options, output, the reader itself or else.

For such simple examples the reason to use enhancer is not obvious and ultimately not needed at all because we don't change the input, output, reader in between and don't require other enhancers dependencies. That being said, keeping conventions is a good thing for community consistency.
