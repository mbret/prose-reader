# Error Handling

Having errors on a book reader is uncommon, things should always pretty much work assuming the library and/or your app does not have "bugs". Some processing such as unzipping archives, fetching resources or rendering complex documents such as PDF can lead to errors but are usually well handled.

## Granular errors vs Globals

For convenience you can handle errors on a global level and just make your entire reader in error state or decide to handle them in a more granular way. One of the most likely component to fail are the Spine items. Check below sections to see how you can listen to errors within prose.

## Errors in Spine Item

SpineItem instances have an error state that you can access when a problem occurs. An error can potentially occur when the resource is fetched for example, or during rendering if you have a complex document handling. That being said, the most typical issue is usually network request error when fetching resources.

You can take advantage of the error state to display a placeholder page to let the user know something went wrong.

{% hint style="info" %}
Our default placeholder pages are using spine item various states to display different states. You can look at it for some examples.
{% endhint %}

