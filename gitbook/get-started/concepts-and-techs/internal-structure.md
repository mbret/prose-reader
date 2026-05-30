# Internal structure

Simplified representation of the internal components structure. This can help you understand the flow of data and how to retrieve specific parts of the reader. There are more components internally but these are the important layers you need to be familiar with.

```mermaid
---
config:
  layout: dagre
---
flowchart TD
    Root["Root"] --> Context["Context"]
    Context --> S["Scrolling Navigator"]
    S --> Viewport["Viewport"]
    Viewport --> C["Controlled Navigator"]
    C --> Spine["Spine"]
    Spine --> Sp1["Spine Item 1"] & Sp2["Spine Item 2"] & Sp3["Spine Item ..."]
    Spine@{ shape: rect}
    style S stroke-width:1px,stroke-dasharray: 1
    style C stroke-width:1px,stroke-dasharray: 1
```
