---
sidebar_position: 2
---

# Limitations

As many things in the world, nothing is perfect. There are unfortunately some limitations that comes together with this reader and you should
make sure your requirements are on pair with them.

The limitations will often refer to two kind of contents, `reflowable` and `pre-paginated`. It's important to understand the difference since they
often have different limitations.

- `reflowable` Any book that contains texts supposed to be rendered as a natural flow. Pages number will dynamically change based on your device screen size. They are the most common books, for example Alice in wonderland, Moby Dick, etc. 
- `pre-paginated` Any book that contains pages that are supposed to be displayed as it is the same way for everyone no matter what device screen they are using. This is commonly used for manga or comics books.

Some of the limitations listed below are hard to workaround by the engine. This means that based on the type of content you want to serve, you need to be aware of the possible limitation or degradation which could occurs. It is not always possible to have built-in fail safe and you should sometime enable / disable some behavior if you are
unsure what type of content / language the user will be using.

**If you are building a Manga / Comic (pre-paginated) reader you can safely play around with any settings. This is because theses type of contents have very few limitations.**
  
## Technical discussion

**Feel free to skip this section if you only want to look at the list of limitations**

It's hard to talk about the limitations without mentioning some of the challenges that comes along the way while implementing reading engine.
There are several different ways of implementing a reading engine and they all comes with pros and cons. 
There is not a magic solution which works perfectly for any type of books, any language while also providing a complete customization of the reader.

If we had to simplify the different methods of implementing a reading engine it can be reduced as two major category:

- Breaking down each chapter & pages into their own container
- Breaking down each chapter into their own container

The difference may seems subtle but they both offer their own advantages (and cons).

Without going into too much details an epub is basically an archive (zip) with a list of web page corresponding to each chapter. Each chapter can be 
rendered on the web directly because it is literally a web page. Most engine uses `iframe` to render the chapters which is great because
the chapter is being rendered as expected, with its styles, fonts, etc.

@todo

🚧
❌
✅

## Curl page turning animation
| reflowable (horizontal-writing) | reflowable (vertical-writing) | pre-paginated |
|---------------------------------|-------------------------------|---------------|
|               ❌                |              ❌               |       ❌       |

Curl animation is not available at the moment. We are working on it but do not expect it for reflow book (especially vertical writing contents).
A first curl version might come in the future for pre-paginated (comic / manga) contents.

## Slide page turning animation
| reflowable (horizontal-writing) | reflowable (vertical-writing) | pre-paginated |
|---------------------------------|-------------------------------|---------------|
|               ✅                |              🚧               |     ✅         |    

![moby-dick-selection-spread-optimisation](https://user-images.githubusercontent.com/1911240/123646523-428f1500-d862-11eb-8f13-d3c037e8528f.gif)
![moby-dick-selection-spread-optimisation](https://user-images.githubusercontent.com/1911240/123646853-8f72eb80-d862-11eb-9e02-855ca53e2d1e.gif)

### reflowable (vertical-writing)
Vertical writing content can only use vertical sliding animation which causes conflict when using horizontal scrolling. This is because sliding through
chapters will results as an horizontal sliding but scrolling through chapter inner pages will end up as vertical sliding. This creates a weird reading experience.
**If you want to use sliding with vertical writing, you should set the scrolling mode to vertical**.

You can see the problem here

![moby-dick-selection-spread-optimisation](https://user-images.githubusercontent.com/1911240/123647994-89313f00-d863-11eb-84a4-35949f41be82.gif)


## Finger pan scrolling (horizontal)
| reflowable (horizontal-writing) | reflowable (vertical-writing) | pre-paginated |
|---------------------------------|-------------------------------|---------------|
|               🚧                  |              ❌              |     ✅        |

![moby-dick-selection-spread-optimisation](https://user-images.githubusercontent.com/1911240/123592949-e65bcf00-d828-11eb-895d-84ac7d01cba2.gif)

As opposed to swiping, finger pan scrolling means that the screen move together with your finger.

### reflowable (horizontal-writing)
**Not recommended**

When reflowable book chapters are loaded / unloaded as you navigate, it can de-synchronize the current finger position with what is under it. This is due to the fact
that we don't know the dimensions of each chapter before loading them (and they can always change dynamically when changing fonts size or else). When chapters load they will
change the size of the viewport and most likely change what is being seen under your finger. This is not a problem when you don't lock the screen position with your finger because as chapters load/unload the viewport position is always adjusted automatically by the engine. The engine will not adjust when you lock the screen for scrolling however. 

**It works better however if you decide to pre-load every chapter of the book**. This will in theory avoid the de-sync once the book is entirely loaded but comes with an increased loading time and memory usage.

### reflowable (vertical-writing)
**Does not work**

This is because vertical writing use a vertical rendering and navigation. Any navigation which involve horizontal movement will not work as expected with vertical writing.

## Page spread

![image](https://user-images.githubusercontent.com/1911240/123593155-27ec7a00-d829-11eb-80ca-0b9a8332b634.png)

| reflowable (horizontal-writing) | reflowable (vertical-writing) | pre-paginated |
|---------------------------------|-------------------------------|---------------|
|               ✅                |              🚧               |       ✅       |

### reflowable (vertical-writing)

![image](https://user-images.githubusercontent.com/1911240/123594704-01c7d980-d82b-11eb-8dee-1cc28b12c73e.png)

Any chapter that is using vertical-writing will not have a page separation and be rendered as one page on the entire screen. This is due to how browsers
renders vertical text and is unlikely to be fixed.