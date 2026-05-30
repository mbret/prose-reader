# Style & CSS

## Stable constants

For convenience with CSS, prose reader defines some constants that will **NEVER** change. This allows you to create stable stylesheets when needed.

* `data-prose-reader-container` data attributes placed on each reader container. Note that without the ID, it targets all reader containers.
* `data-prose-reader-viewport` data attributes placed on the viewport element.

## Reader instance & Considerations

When you want to add or override some styles, be careful whether you want to target all readers or the specific one the enhancer is attached to. All data-attributes used have an ID attached to it. You need to target the specific ID together with the data attribute if you want to apply your style to a specific reader instance.

You can retrieve the reader id with `reader.id` .&#x20;

You will not be able to use this statically inside .css files since it is not possible to use variables in selectors. Check the next sections to see the strategies on how to add your styles.

## Adding / Overriding styles strategies

### Global vs Per Instance

If you are adding style for your plugin or enhancer, you may want to be careful when targeting the reader elements. In order for your style to be scoped to a specific reader instance, you need to consider using either:

* Reader ID: The ID is unique per instance
* Enhancer own scope: Alternatively you can use your own enhancer scope to put your CSS under

Always consider the fact that an enhancer is attached to a specific reader instance and therefore should not have its style leak outside.

### Static CSS files

Just like regular css files, you can include your stylesheet in your document. You can then use prose reader constants when needed. The only drawback is that you cannot target a specific reader instance since you cannot use the ID in the selectors.

If you are making an enhancer, you can add a specific attribute to the reader instance and use it as static selector as well.

This way you can also export some static css assets from your package.

Whenever you target `[data-my-enhancer]` in your css files, you can be sure they will be applied to only the readers with your enhancer plugged in.

```typescript
// Inside your enhancer
const reader = next(options)

const sub = reader.context.watch(`rootElement`).pipe(
  tap((container) => {
    // Always set your attribute to the container of the given reader instance
    container.setAttribute("data-my-enhancer", "true")
  }),
)

// don't forget to unsubscribe on reader destroy
```

{% hint style="warning" %}
If your CSS is small and you want to make it convenient for the user of your enhancer, consider the javascript approach instead.
{% endhint %}

### Javascript

#### Targeting Reader selectors

Using javascript to add your style is the only way you can target a reader instance style specifically. When you make an enhancer, you should make sure to target the reader instance you are attached to and avoid injecting your style for all readers on the page.

The reader instance exposes a convenient method to inject your CSS in a safe way.

```typescript
const style = `
[data-prose-reader-container=${id}] {
  background-color: red;
}
`

// or even better
// import style from "./style.css?inline"

const removeStyle = reader.utils.injectScopedCSS(
    document,
    "my-super-enhancer",
    style
)

// This will create style element that looks like this
<style id="my-super-enhancer-eb75a4ed-6be2-487b-81b3-d8c22bd8668f">
  [data-prose-reader-container=eb75a4ed-6be2-487b-81b3-d8c22bd8668f] {
    background-color: red;
  }
</style>

// Later, when reader instance is destroyed
removeStyle()
```

There are several things happening:

* Your style has a unique name based on your scope and the reader instance. This avoid clashing between `<style>` elements
* Your style is targeting a specific reader instance ID so your style will only apply to the reader it's being injected into

`${id}` is a special template string that will get replaced automatically for you.

{% hint style="warning" %}
You may have noticed the drawback here, the style content is actually part of your javascript file. It adds up to the bundle size. This is not a problem if your style is not huge but you may consider other approaches if your enhancer adds a ton of style.
{% endhint %}
