# Viewport

The viewport is the visible reading area. It is not to be confused with pagination and navigation.

## Purpose of a viewport

The purpose of the viewport is to allow more flexibility in how and what are visible to the user while maintaining stable calculations internally. The pagination and navigation are two of the hardest things to get right in a reader and they need t have stable measures to do so. An extra layer as such allow decoupling the "view" from the "rendering".

For example, zooming out (thumbnails) or in is much easier when manipulating the viewport since you don't mess up with documents or the layout itself. You can imagine the viewport as a virtual layer that can be transformed without affecting the behavior of the engine.

The viewport can be for example wrapped within a scroll navigator and thus take the scrollbar width into account. As a result the entire reader will be updated accordingly to follow the new viewport.

{% hint style="info" %}
To have a functioning and predictable reading system you obviously have to put limitations on what the developer can do. This additional layer between the reader container and the spine element gives an extra freedom.
{% endhint %}

## Recommendations and precautions

To avoid conflict between features and undesired behaviors here is a list of recommendations when manipulating or using the viewport:

* Avoid setting style directly on the element. You may inadvertently revert the change of another feature. Prefer using css classes for example and take advantage of inheritance.
* Avoid negative margins
* Avoid mutating the viewport at different places, try to keep a single place of responsibility (or enhancer) to set your viewport.
* Remember to `layout()` if you change the viewport style.

## Adjusting size, margin, etc

A relatively simple manipulation of the viewport can be to change its size and margin. For example to make more items visible when scrolling. [refit.md](../enhancers/refit.md "mention") enhancer is a good example taking advantage of the viewport resizing.

<div align="center"><figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (3).png" alt="" width="188"><figcaption></figcaption></figure> <figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (2) (1).png" alt="" width="188"><figcaption></figcaption></figure></div>

## Absolute vs Relative viewport

The absolute viewport represent the dimensions given when creating the reader and is the dimension used internally for pagination, navigation and all the calculations. The relative viewport represent the viewing area after transformation are applied.

<div><figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (1) (1).png" alt="" width="188"><figcaption><p>Relative viewport (scale: 0.5)</p></figcaption></figure> <figure><img src="../.gitbook/assets/localhost_9000_reader_aHR0cDovL2xvY2FsaG9zdDo5MDAwL2VwdWJzL3JlbmRpdGlvbi1mbG93LXdlYnRvb24uZXB1Yg==_free&#x26;vertical(iPhone SE) (2).png" alt="" width="188"><figcaption><p>Absolute viewport</p></figcaption></figure></div>

{% hint style="info" %}
Some calculations will always use the absolute viewport (eg: navigation) to keep consistency and correct results while other behaviors might take advantage of the absolute viewport. For example, prose will always load documents that are visible on the relative viewport.
{% endhint %}



