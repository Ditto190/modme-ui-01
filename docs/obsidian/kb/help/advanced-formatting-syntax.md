---
timestamp: 2026-07-12T01:29:28+10:00
agent: "human"
agent_role: "researcher"
type: "snippet"
severity: "medium"
tags:
  - "clipper"
  - "snippet"
  - "SoftwareSourceCode"
  - "obsidian.md"
  - "advanced-syntax"
title: "advanced-syntax"
summary: "Core plugins - Obsidian Help"
source: "https://obsidian.md/help/advanced-syntax"
schema_type: "SoftwareSourceCode"
code_sample_type: "full"
file_name: "advanced-syntax"
file_extension: "advanced-syntax"
programming_language: "advanced-syntax"
encoding_format: "text/plain"
code_repository:
code_path: "advanced-syntax"
commit_ref:
raw_url: "https://obsidian.md/help/advanced-syntax"
---

# advanced-syntax

**URL:** https://obsidian.md/help/advanced-syntax
**Path:** advanced-syntax
**Language:** advanced-syntax · **Extension:** `.advanced-syntax`
**encodingFormat:** text/plain
**codeSampleType:** full

## Semantic summary

Core plugins - Obsidian Help


## Source


_No source text extracted from the blob viewer._

1. Wait for the file to finish loading, then clip again, **or**
2. Open **Raw** (`https://obsidian.md/help/advanced-syntax`) and clip that page, **or**
3. Select the code in the viewer before clipping.

Do not rely on Defuddle `Learn how to add advanced formatting syntax to your notes.

## Tables

You can create tables using vertical bars (`|`) to separate columns and hyphens (`-`) to define headers. Here's an example:

```md
| First name | Last name |
| ---------- | --------- |
| Max        | Planck    |
| Marie      | Curie     |
```

| First name | Last name |
| --- | --- |
| Max | Planck |
| Marie | Curie |

While the vertical bars on either side of the table are optional, including them is recommended for readability.

> [!tip] In Live Preview, you can right-click a table to add or delete columns and rows. You can also sort and move them using the context menu.
> 

You can insert a table using the **Insert Table** command from the [Command Palette](https://obsidian.md/help/plugins/command-palette) or by right-clicking and selecting *Insert → Table*. This will give you a basic, editable table:

```md
|     |     |
| --- | --- |
|     |     |
```

```md
First name | Last name
-- | --
Max | Planck
Marie | Curie
```

### Format content within a table

You can use [basic formatting syntax](https://obsidian.md/help/syntax) to style content within a table.

| First column | Second column |
| --- | --- |
| [Internal links](https://obsidian.md/help/links) | Link to a file *within* your **vault**. |
| [Embed files](https://obsidian.md/help/embeds) | ![Engelbart.jpg](https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg) |

> [!note] Vertical bars in tables
> If you want to use [aliases](https://obsidian.md/help/aliases), or to [resize an image](https://obsidian.md/help/syntax#External%20images) in your table, you need to add a `\` before the vertical bar.
> 
> ```md
> First column | Second column
> -- | --
> [[Basic formatting syntax\|Markdown syntax]] | ![[Engelbart.jpg\|200]]
> ```
> 
> | First column | Second column |
> | --- | --- |
> | [Markdown syntax](https://obsidian.md/help/syntax) | ![Engelbart.jpg](https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg) |

Align text in columns by adding colons (`:`) to the header row. You can also align content in *Live Preview* via the context menu.

```md
Left-aligned text | Center-aligned text | Right-aligned text
:-- | :--: | --:
Content | Content | Content
```

| Left-aligned text | Center-aligned text | Right-aligned text |
| --- | --- | --- |
| Content | Content | Content |

## Diagram

You can add diagrams and charts to your notes, using [Mermaid](https://mermaid-js.github.io/). Mermaid supports a range of diagrams, such as [flow charts](https://mermaid.js.org/syntax/flowchart.html), [sequence diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html), and [timelines](https://mermaid.js.org/syntax/timeline.html).

> [!tip] Tip
> You can also try Mermaid's [Live Editor](https://mermaid-js.github.io/mermaid-live-editor) to help you build diagrams before you include them in your notes.

To add a Mermaid diagram, create a `mermaid` [code block](https://obsidian.md/help/syntax#Code%20blocks).

```md
mermaid
```

<svg aria-roledescription="sequence" role="graphics-document document" viewBox="-50 -10 496 379" height="379" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" width="496" id="m0d5448dba2574cf1"><g><rect ry="3" rx="3" name="John" height="65" width="150" stroke="#666" fill="#eaeaea" y="293" x="246"></rect><text alignment-baseline="central" dominant-baseline="central" style="text-anchor: middle; font-size: 16px; font-weight: 400;" y="325.5" x="321"><tspan dy="0" x="321">John</tspan></text></g> <g><rect ry="3" rx="3" name="Alice" height="65" width="150" stroke="#666" fill="#eaeaea" y="293" x="0"></rect><text alignment-baseline="central" dominant-baseline="central" style="text-anchor: middle; font-size: 16px; font-weight: 400;" y="325.5" x="75"><tspan dy="0" x="75">Alice</tspan></text></g> <g><line name="John" stroke="#999" stroke-width="0.5px" y2="293" x2="321" y1="65" x1="321" id="actor1"></line><g id="root-1"><rect ry="3" rx="3" name="John" height="65" width="150" stroke="#666" fill="#eaeaea" y="0" x="246"></rect><text alignment-baseline="central" dominant-baseline="central" style="text-anchor: middle; font-size: 16px; font-weight: 400;" y="32.5" x="321"><tspan dy="0" x="321">John</tspan></text></g></g> <g><line name="Alice" stroke="#999" stroke-width="0.5px" y2="293" x2="75" y1="65" x1="75" id="actor0"></line><g id="root-0"><rect ry="3" rx="3" name="Alice" height="65" width="150" stroke="#666" fill="#eaeaea" y="0" x="0"></rect><text alignment-baseline="central" dominant-baseline="central" style="text-anchor: middle; font-size: 16px; font-weight: 400;" y="32.5" x="75"><tspan dy="0" x="75">Alice</tspan></text></g></g> <g></g><defs><symbol height="24" width="24" id="computer"><path d="M2 2v13h20v-13h-20zm18 11h-16v-9h16v9zm-10.228 6l.466-1h3.524l.467 1h-4.457zm14.228 3h-24l2-6h2.104l-1.33 4h18.45l-1.297-4h2.073l2 6zm-5-10h-14v-7h14v7z" transform="scale(.5)"></path></symbol></defs><defs><symbol clip-rule="evenodd" fill-rule="evenodd" id="database"><path d="M12.258.001l.256.004.255.005.253.008.251.01.249.012.247.015.246.016.242.019.241.02.239.023.236.024.233.027.231.028.229.031.225.032.223.034.22.036.217.038.214.04.211.041.208.043.205.045.201.046.198.048.194.05.191.051.187.053.183.054.18.056.175.057.172.059.168.06.163.061.16.063.155.064.15.066.074.033.073.033.071.034.07.034.069.035.068.035.067.035.066.035.064.036.064.036.062.036.06.036.06.037.058.037.058.037.055.038.055.038.053.038.052.038.051.039.05.039.048.039.047.039.045.04.044.04.043.04.041.04.04.041.039.041.037.041.036.041.034.041.033.042.032.042.03.042.029.042.027.042.026.043.024.043.023.043.021.043.02.043.018.044.017.043.015.044.013.044.012.044.011.045.009.044.007.045.006.045.004.045.002.045.001.045v17l-.001.045-.002.045-.004.045-.006.045-.007.045-.009.044-.011.045-.012.044-.013.044-.015.044-.017.043-.018.044-.02.043-.021.043-.023.043-.024.043-.026.043-.027.042-.029.042-.03.042-.032.042-.033.042-.034.041-.036.041-.037.041-.039.041-.04.041-.041.04-.043.04-.044.04-.045.04-.047.039-.048.039-.05.039-.051.039-.052.038-.053.038-.055.038-.055.038-.058.037-.058.037-.06.037-.06.036-.062.036-.064.036-.064.036-.066.035-.067.035-.068.035-.069.035-.07.034-.071.034-.073.033-.074.033-.15.066-.155.064-.16.063-.163.061-.168.06-.172.059-.175.057-.18.056-.183.054-.187.053-.191.051-.194.05-.198.048-.201.046-.205.045-.208.043-.211.041-.214.04-.217.038-.22.036-.223.034-.225.032-.229.031-.231.028-.233.027-.236.024-.239.023-.241.02-.242.019-.246.016-.247.015-.249.012-.251.01-.253.008-.255.005-.256.004-.258.001-.258-.001-.256-.004-.255-.005-.253-.008-.251-.01-.249-.012-.247-.015-.245-.016-.243-.019-.241-.02-.238-.023-.236-.024-.234-.027-.231-.028-.228-.031-.226-.032-.223-.034-.22-.036-.217-.038-.214-.04-.211-.041-.208-.043-.204-.045-.201-.046-.198-.048-.195-.05-.19-.051-.187-.053-.184-.054-.179-.056-.176-.057-.172-.059-.167-.06-.164-.061-.159-.063-.155-.064-.151-.066-.074-.033-.072-.033-.072-.034-.07-.034-.069-.035-.068-.035-.067-.035-.066-.035-.064-.036-.063-.036-.062-.036-.061-.036-.06-.037-.058-.037-.057-.037-.056-.038-.055-.038-.053-.038-.052-.038-.051-.039-.049-.039-.049-.039-.046-.039-.046-.04-.044-.04-.043-.04-.041-.04-.04-.041-.039-.041-.037-.041-.036-.041-.034-.041-.033-.042-.032-.042-.03-.042-.029-.042-.027-.042-.026-.043-.024-.043-.023-.043-.021-.043-.02-.043-.018-.044-.017-.043-.015-.044-.013-.044-.012-.044-.011-.045-.009-.044-.007-.045-.006-.045-.004-.045-.002-.045-.001-.045v-17l.001-.045.002-.045.004-.045.006-.045.007-.045.009-.044.011-.045.012-.044.013-.044.015-.044.017-.043.018-.044.02-.043.021-.043.023-.043.024-.043.026-.043.027-.042.029-.042.03-.042.032-.042.033-.042.034-.041.036-.041.037-.041.039-.041.04-.041.041-.04.043-.04.044-.04.046-.04.046-.039.049-.039.049-.039.051-.039.052-.038.053-.038.055-.038.056-.038.057-.037.058-.037.06-.037.061-.036.062-.036.063-.036.064-.036.066-.035.067-.035.068-.035.069-.035.07-.034.072-.034.072-.033.074-.033.151-.066.155-.064.159-.063.164-.061.167-.06.172-.059.176-.057.179-.056.184-.054.187-.053.19-.051.195-.05.198-.048.201-.046.204-.045.208-.043.211-.041.214-.04.217-.038.22-.036.223-.034.226-.032.228-.031.231-.028.234-.027.236-.024.238-.023.241-.02.243-.019.245-.016.247-.015.249-.012.251-.01.253-.008.255-.005.256-.004.258-.001.258.001zm-9.258 20.499v.01l.001.021.003.021.004.022.005.021.006.022.007.022.009.023.01.022.011.023.012.023.013.023.015.023.016.024.017.023.018.024.019.024.021.024.022.025.023.024.024.025.052.049.056.05.061.051.066.051.07.051.075.051.079.052.084.052.088.052.092.052.097.052.102.051.105.052.11.052.114.051.119.051.123.051.127.05.131.05.135.05.139.048.144.049.147.047.152.047.155.047.16.045.163.045.167.043.171.043.176.041.178.041.183.039.187.039.19.037.194.035.197.035.202.033.204.031.209.03.212.029.216.027.219.025.222.024.226.021.23.02.233.018.236.016.24.015.243.012.246.01.249.008.253.005.256.004.259.001.26-.001.257-.004.254-.005.25-.008.247-.011.244-.012.241-.014.237-.016.233-.018.231-.021.226-.021.224-.024.22-.026.216-.027.212-.028.21-.031.205-.031.202-.034.198-.034.194-.036.191-.037.187-.039.183-.04.179-.04.175-.042.172-.043.168-.044.163-.045.16-.046.155-.046.152-.047.148-.048.143-.049.139-.049.136-.05.131-.05.126-.05.123-.051.118-.052.114-.051.11-.052.106-.052.101-.052.096-.052.092-.052.088-.053.083-.051.079-.052.074-.052.07-.051.065-.051.06-.051.056-.05.051-.05.023-.024.023-.025.021-.024.02-.024.019-.024.018-.024.017-.024.015-.023.014-.024.013-.023.012-.023.01-.023.01-.022.008-.022.006-.022.006-.022.004-.022.004-.021.001-.021.001-.021v-4.127l-.077.055-.08.053-.083.054-.085.053-.087.052-.09.052-.093.051-.095.05-.097.05-.1.049-.102.049-.105.048-.106.047-.109.047-.111.046-.114.045-.115.045-.118.044-.12.043-.122.042-.124.042-.126.041-.128.04-.13.04-.132.038-.134.038-.135.037-.138.037-.139.035-.142.035-.143.034-.144.033-.147.032-.148.031-.15.03-.151.03-.153.029-.154.027-.156.027-.158.026-.159.025-.161.024-.162.023-.163.022-.165.021-.166.02-.167.019-.169.018-.169.017-.171.016-.173.015-.173.014-.175.013-.175.012-.177.011-.178.01-.179.008-.179.008-.181.006-.182.005-.182.004-.184.003-.184.002h-.37l-.184-.002-.184-.003-.182-.004-.182-.005-.181-.006-.179-.008-.179-.008-.178-.01-.176-.011-.176-.012-.175-.013-.173-.014-.172-.015-.171-.016-.17-.017-.169-.018-.167-.019-.166-.02-.165-.021-.163-.022-.162-.023-.161-.024-.159-.025-.157-.026-.156-.027-.155-.027-.153-.029-.151-.03-.15-.03-.148-.031-.146-.032-.145-.033-.143-.034-.141-.035-.14-.035-.137-.037-.136-.037-.134-.038-.132-.038-.13-.04-.128-.04-.126-.041-.124-.042-.122-.042-.12-.044-.117-.043-.116-.045-.113-.045-.112-.046-.109-.047-.106-.047-.105-.048-.102-.049-.1-.049-.097-.05-.095-.05-.093-.052-.09-.051-.087-.052-.085-.053-.083-.054-.08-.054-.077-.054v4.127zm0-5.654v.011l.001.021.003.021.004.021.005.022.006.022.007.022.009.022.01.022.011.023.012.023.013.023.015.024.016.023.017.024.018.024.019.024.021.024.022.024.023.025.024.024.052.05.056.05.061.05.066.051.07.051.075.052.079.051.084.052.088.052.092.052.097.052.102.052.105.052.11.051.114.051.119.052.123.05.127.051.131.05.135.049.139.049.144.048.147.048.152.047.155.046.16.045.163.045.167.044.171.042.176.042.178.04.183.04.187.038.19.037.194.036.197.034.202.033.204.032.209.03.212.028.216.027.219.025.222.024.226.022.23.02.233.018.236.016.24.014.243.012.246.01.249.008.253.006.256.003.259.001.26-.001.257-.003.254-.006.25-.008.247-.01.244-.012.241-.015.237-.016.233-.018.231-.02.226-.022.224-.024.22-.025.216-.027.212-.029.21-.03.205-.032.202-.033.198-.035.194-.036.191-.037.187-.039.183-.039.179-.041.175-.042.172-.043.168-.044.163-.045.16-.045.155-.047.152-.047.148-.048.143-.048.139-.05.136-.049.131-.05.126-.051.123-.051.118-.051.114-.052.11-.052.106-.052.101-.052.096-.052.092-.052.088-.052.083-.052.079-.052.074-.051.07-.052.065-.051.06-.05.056-.051.051-.049.023-.025.023-.024.021-.025.02-.024.019-.024.018-.024.017-.024.015-.023.014-.023.013-.024.012-.022.01-.023.01-.023.008-.022.006-.022.006-.022.004-.021.004-.022.001-.021.001-.021v-4.139l-.077.054-.08.054-.083.054-.085.052-.087.053-.09.051-.093.051-.095.051-.097.05-.1.049-.102.049-.105.048-.106.047-.109.047-.111.046-.114.045-.115.044-.118.044-.12.044-.122.042-.124.042-.126.041-.128.04-.13.039-.132.039-.134.038-.135.037-.138.036-.139.036-.142.035-.143.033-.144.033-.147.033-.148.031-.15.03-.151.03-.153.028-.154.028-.156.027-.158.026-.159.025-.161.024-.162.023-.163.022-.165.021-.166.02-.167.019-.169.018-.169.017-.171.016-.173.015-.173.014-.175.013-.175.012-.177.011-.178.009-.179.009-.179.007-.181.007-.182.005-.182.004-.184.003-.184.002h-.37l-.184-.002-.184-.003-.182-.004-.182-.005-.181-.007-.179-.007-.179-.009-.178-.009-.176-.011-.176-.012-.175-.013-.173-.014-.172-.015-.171-.016-.17-.017-.169-.018-.167-.019-.166-.02-.165-.021-.163-.022-.162-.023-.161-.024-.159-.025-.157-.026-.156-.027-.155-.028-.153-.028-.151-.03-.15-.03-.148-.031-.146-.033-.145-.033-.143-.033-.141-.035-.14-.036-.137-.036-.136-.037-.134-.038-.132-.039-.13-.039-.128-.04-.126-.041-.124-.042-.122-.043-.12-.043-.117-.044-.116-.044-.113-.046-.112-.046-.109-.046-.106-.047-.105-.048-.102-.049-.1-.049-.097-.05-.095-.051-.093-.051-.09-.051-.087-.053-.085-.052-.083-.054-.08-.054-.077-.054v4.139zm0-5.666v.011l.001.02.003.022.004.021.005.022.006.021.007.022.009.023.01.022.011.023.012.023.013.023.015.023.016.024.017.024.018.023.019.024.021.025.022.024.023.024.024.025.052.05.056.05.061.05.066.051.07.051.075.052.079.051.084.052.088.052.092.052.097.052.102.052.105.051.11.052.114.051.119.051.123.051.127.05.131.05.135.05.139.049.144.048.147.048.152.047.155.046.16.045.163.045.167.043.171.043.176.042.178.04.183.04.187.038.19.037.194.036.197.034.202.033.204.032.209.03.212.028.216.027.219.025.222.024.226.021.23.02.233.018.236.017.24.014.243.012.246.01.249.008.253.006.256.003.259.001.26-.001.257-.003.254-.006.25-.008.247-.01.244-.013.241-.014.237-.016.233-.018.231-.02.226-.022.224-.024.22-.025.216-.027.212-.029.21-.03.205-.032.202-.033.198-.035.194-.036.191-.037.187-.039.183-.039.179-.041.175-.042.172-.043.168-.044.163-.045.16-.045.155-.047.152-.047.148-.048.143-.049.139-.049.136-.049.131-.051.126-.05.123-.051.118-.052.114-.051.11-.052.106-.052.101-.052.096-.052.092-.052.088-.052.083-.052.079-.052.074-.052.07-.051.065-.051.06-.051.056-.05.051-.049.023-.025.023-.025.021-.024.02-.024.019-.024.018-.024.017-.024.015-.023.014-.024.013-.023.012-.023.01-.022.01-.023.008-.022.006-.022.006-.022.004-.022.004-.021.001-.021.001-.021v-4.153l-.077.054-.08.054-.083.053-.085.053-.087.053-.09.051-.093.051-.095.051-.097.05-.1.049-.102.048-.105.048-.106.048-.109.046-.111.046-.114.046-.115.044-.118.044-.12.043-.122.043-.124.042-.126.041-.128.04-.13.039-.132.039-.134.038-.135.037-.138.036-.139.036-.142.034-.143.034-.144.033-.147.032-.148.032-.15.03-.151.03-.153.028-.154.028-.156.027-.158.026-.159.024-.161.024-.162.023-.163.023-.165.021-.166.02-.167.019-.169.018-.169.017-.171.016-.173.015-.173.014-.175.013-.175.012-.177.01-.178.01-.179.009-.179.007-.181.006-.182.006-.182.004-.184.003-.184.001-.185.001-.185-.001-.184-.001-.184-.003-.182-.004-.182-.006-.181-.006-.179-.007-.179-.009-.178-.01-.176-.01-.176-.012-.175-.013-.173-.014-.172-.015-.171-.016-.17-.017-.169-.018-.167-.019-.166-.02-.165-.021-.163-.023-.162-.023-.161-.024-.159-.024-.157-.026-.156-.027-.155-.028-.153-.028-.151-.03-.15-.03-.148-.032-.146-.032-.145-.033-.143-.034-.141-.034-.14-.036-.137-.036-.136-.037-.134-.038-.132-.039-.13-.039-.128-.041-.126-.041-.124-.041-.122-.043-.12-.043-.117-.044-.116-.044-.113-.046-.112-.046-.109-.046-.106-.048-.105-.048-.102-.048-.1-.05-.097-.049-.095-.051-.093-.051-.09-.052-.087-.052-.085-.053-.083-.053-.08-.054-.077-.054v4.153zm8.74-8.179l-.257.004-.254.005-.25.008-.247.011-.244.012-.241.014-.237.016-.233.018-.231.021-.226.022-.224.023-.22.026-.216.027-.212.028-.21.031-.205.032-.202.033-.198.034-.194.036-.191.038-.187.038-.183.04-.179.041-.175.042-.172.043-.168.043-.163.045-.16.046-.155.046-.152.048-.148.048-.143.048-.139.049-.136.05-.131.05-.126.051-.123.051-.118.051-.114.052-.11.052-.106.052-.101.052-.096.052-.092.052-.088.052-.083.052-.079.052-.074.051-.07.052-.065.051-.06.05-.056.05-.051.05-.023.025-.023.024-.021.024-.02.025-.019.024-.018.024-.017.023-.015.024-.014.023-.013.023-.012.023-.01.023-.01.022-.008.022-.006.023-.006.021-.004.022-.004.021-.001.021-.001.021.001.021.001.021.004.021.004.022.006.021.006.023.008.022.01.022.01.023.012.023.013.023.014.023.015.024.017.023.018.024.019.024.02.025.021.024.023.024.023.025.051.05.056.05.06.05.065.051.07.052.074.051.079.052.083.052.088.052.092.052.096.052.101.052.106.052.11.052.114.052.118.051.123.051.126.051.131.05.136.05.139.049.143.048.148.048.152.048.155.046.16.046.163.045.168.043.172.043.175.042.179.041.183.04.187.038.191.038.194.036.198.034.202.033.205.032.21.031.212.028.216.027.22.026.224.023.226.022.231.021.233.018.237.016.241.014.244.012.247.011.25.008.254.005.257.004.26.001.26-.001.257-.004.254-.005.25-.008.247-.011.244-.012.241-.014.237-.016.233-.018.231-.021.226-.022.224-.023.22-.026.216-.027.212-.028.21-.031.205-.032.202-.033.198-.034.194-.036.191-.038.187-.038.183-.04.179-.041.175-.042.172-.043.168-.043.163-.045.16-.046.155-.046.152-.048.148-.048.143-.048.139-.049.136-.05.131-.05.126-.051.123-.051.118-.051.114-.052.11-.052.106-.052.101-.052.096-.052.092-.052.088-.052.083-.052.079-.052.074-.051.07-.052.065-.051.06-.05.056-.05.051-.05.023-.025.023-.024.021-.024.02-.025.019-.024.018-.024.017-.023.015-.024.014-.023.013-.023.012-.023.01-.023.01-.022.008-.022.006-.023.006-.021.004-.022.004-.021.001-.021.001-.021-.001-.021-.001-.021-.004-.021-.004-.022-.006-.021-.006-.023-.008-.022-.01-.022-.01-.023-.012-.023-.013-.023-.014-.023-.015-.024-.017-.023-.018-.024-.019-.024-.02-.025-.021-.024-.023-.024-.023-.025-.051-.05-.056-.05-.06-.05-.065-.051-.07-.052-.074-.051-.079-.052-.083-.052-.088-.052-.092-.052-.096-.052-.101-.052-.106-.052-.11-.052-.114-.052-.118-.051-.123-.051-.126-.051-.131-.05-.136-.05-.139-.049-.143-.048-.148-.048-.152-.048-.155-.046-.16-.046-.163-.045-.168-.043-.172-.043-.175-.042-.179-.041-.183-.04-.187-.038-.191-.038-.194-.036-.198-.034-.202-.033-.205-.032-.21-.031-.212-.028-.216-.027-.22-.026-.224-.023-.226-.022-.231-.021-.233-.018-.237-.016-.241-.014-.244-.012-.247-.011-.25-.008-.254-.005-.257-.004-.26-.001-.26.001z" transform="scale(.5)"></path></symbol></defs><defs><symbol height="24" width="24" id="clock"><path d="M12 2c5.514 0 10 4.486 10 10s-4.486 10-10 10-10-4.486-10-10 4.486-10 10-10zm0-2c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.848 12.459c.202.038.202.333.001.372-1.907.361-6.045 1.111-6.547 1.111-.719 0-1.301-.582-1.301-1.301 0-.512.77-5.447 1.125-7.445.034-.192.312-.181.343.014l.985 6.238 5.394 1.011z" transform="scale(.5)"></path></symbol></defs><defs><marker orient="auto-start-reverse" markerHeight="12" markerWidth="12" markerUnits="userSpaceOnUse" refY="5" refX="7.9" id="m0d5448dba2574cf1-arrowhead"><path d="M -1 0 L 10 5 L 0 10 z"></path></marker></defs><defs><marker refY="4.5" refX="4" orient="auto" markerHeight="8" markerWidth="15" id="m0d5448dba2574cf1-crosshead"><path style="stroke-dasharray: 0, 0;" d="M 1,2 L 6,7 M 6,2 L 1,7" stroke-width="1pt" stroke="#000000" fill="none"></path></marker></defs><defs><marker orient="auto" markerHeight="28" markerWidth="20" refY="7" refX="15.5" id="m0d5448dba2574cf1-filled-head"><path d="M 18,7 L9,13 L14,7 L9,1 Z"></path></marker></defs><defs><marker orient="auto" markerHeight="40" markerWidth="60" refY="15" refX="15" id="m0d5448dba2574cf1-sequencenumber"><circle r="6" cy="15" cx="15"></circle></marker></defs><g><rect height="156" width="10" stroke="#666" fill="#EDF2AE" y="117" x="316"></rect></g><g><rect height="50" width="10" stroke="#666" fill="#EDF2AE" y="171" x="321"></rect></g><text dy="1em" style="font-size: 16px; font-weight: 400;" alignment-baseline="middle" dominant-baseline="middle" text-anchor="middle" y="80" x="195">Hello John, how are you?</text><line style="fill: none;" marker-end="url(#m0d5448dba2574cf1-arrowhead)" stroke="none" stroke-width="2" y2="117" x2="313" y1="117" x1="76"></line> <text dy="1em" style="font-size: 16px; font-weight: 400;" alignment-baseline="middle" dominant-baseline="middle" text-anchor="middle" y="132" x="195">John, can you hear me?</text><line style="fill: none;" marker-end="url(#m0d5448dba2574cf1-arrowhead)" stroke="none" stroke-width="2" y2="169" x2="313" y1="169" x1="76"></line> <text dy="1em" style="font-size: 16px; font-weight: 400;" alignment-baseline="middle" dominant-baseline="middle" text-anchor="middle" y="184" x="198">Hi Alice, I can hear you!</text><line marker-end="url(#m0d5448dba2574cf1-arrowhead)" style="stroke-dasharray: 3, 3; fill: none;" stroke="none" stroke-width="2" y2="221" x2="79" y1="221" x1="316"></line> <text dy="1em" style="font-size: 16px; font-weight: 400;" alignment-baseline="middle" dominant-baseline="middle" text-anchor="middle" y="236" x="198">I feel great!</text><line marker-end="url(#m0d5448dba2574cf1-arrowhead)" style="stroke-dasharray: 3, 3; fill: none;" stroke="none" stroke-width="2" y2="273" x2="79" y1="273" x1="316"></line></svg>

```md
mermaid
```

<svg aria-roledescription="flowchart-v2" role="graphics-document document" viewBox="0 0 146.5 174" height="174" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" width="146.5" id="m2214854c85f09e7d"><g><marker orient="auto" markerHeight="8" markerWidth="8" markerUnits="userSpaceOnUse" refY="5" refX="5" viewBox="0 0 10 10" id="m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-pointEnd"><path style="stroke-width: 1; stroke-dasharray: 1, 0;" d="M 0 0 L 10 5 L 0 10 z"></path></marker><marker orient="auto" markerHeight="8" markerWidth="8" markerUnits="userSpaceOnUse" refY="5" refX="4.5" viewBox="0 0 10 10" id="m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-pointStart"><path style="stroke-width: 1; stroke-dasharray: 1, 0;" d="M 0 5 L 10 10 L 10 0 z"></path></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5" refX="11" viewBox="0 0 10 10" id="m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-circleEnd"><circle style="stroke-width: 1; stroke-dasharray: 1, 0;" r="5" cy="5" cx="5"></circle></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5" refX="-1" viewBox="0 0 10 10" id="m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-circleStart"><circle style="stroke-width: 1; stroke-dasharray: 1, 0;" r="5" cy="5" cx="5"></circle></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5.2" refX="12" viewBox="0 0 11 11" id="m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-crossEnd"><path style="stroke-width: 2; stroke-dasharray: 1, 0;" d="M 1,1 l 9,9 M 10,1 l -9,9"></path></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5.2" refX="-1" viewBox="0 0 11 11" id="m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-crossStart"><path style="stroke-width: 2; stroke-dasharray: 1, 0;" d="M 1,1 l 9,9 M 10,1 l -9,9"></path></marker><g><g></g><g><path marker-end="url(#m2214854c85f09e7d-m2214854c85f09e7d_flowchart-v2-pointEnd)" style="" id="L_Biology_Chemistry_0" d="M73.25,62L73.25,66.167C73.25,70.333,73.25,78.667,73.25,86.333C73.25,94,73.25,101,73.25,104.5L73.25,108" fill="none" stroke="currentColor"></path></g><g><g><g transform="translate(0, 0)"></g></g></g><g><g transform="translate(73.25, 35)" id="flowchart-Biology-0"><rect height="54" width="112.84375" y="-27" x="-56.421875" style="" fill="none" stroke="currentColor"></rect><g transform="translate(-26.421875, -12)" style=""><rect></rect><foreignObject height="24" width="52.84375"><p>Biology</p></foreignObject></g></g><g transform="translate(73.25, 139)" id="flowchart-Chemistry-1"><rect height="54" width="130.5" y="-27" x="-65.25" style="" fill="none" stroke="currentColor"></rect><g transform="translate(-35.25, -12)" style=""><rect></rect><foreignObject height="24" width="70.5"><p>Chemistry</p></foreignObject></g></g></g></g></g></svg>

### Linking files in a diagram

You can create [internal links](https://obsidian.md/help/links) in your diagrams by attaching the `internal-link` [class](https://mermaid.js.org/syntax/flowchart.html#classes) to your nodes.

```md
mermaid
```

<svg aria-roledescription="flowchart-v2" role="graphics-document document" viewBox="0 0 146.5 174" height="174" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" width="146.5" id="m84bdb3482d5b94d0"><g><marker orient="auto" markerHeight="8" markerWidth="8" markerUnits="userSpaceOnUse" refY="5" refX="5" viewBox="0 0 10 10" id="m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-pointEnd"><path style="stroke-width: 1; stroke-dasharray: 1, 0;" d="M 0 0 L 10 5 L 0 10 z"></path></marker><marker orient="auto" markerHeight="8" markerWidth="8" markerUnits="userSpaceOnUse" refY="5" refX="4.5" viewBox="0 0 10 10" id="m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-pointStart"><path style="stroke-width: 1; stroke-dasharray: 1, 0;" d="M 0 5 L 10 10 L 10 0 z"></path></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5" refX="11" viewBox="0 0 10 10" id="m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-circleEnd"><circle style="stroke-width: 1; stroke-dasharray: 1, 0;" r="5" cy="5" cx="5"></circle></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5" refX="-1" viewBox="0 0 10 10" id="m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-circleStart"><circle style="stroke-width: 1; stroke-dasharray: 1, 0;" r="5" cy="5" cx="5"></circle></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5.2" refX="12" viewBox="0 0 11 11" id="m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-crossEnd"><path style="stroke-width: 2; stroke-dasharray: 1, 0;" d="M 1,1 l 9,9 M 10,1 l -9,9"></path></marker><marker orient="auto" markerHeight="11" markerWidth="11" markerUnits="userSpaceOnUse" refY="5.2" refX="-1" viewBox="0 0 11 11" id="m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-crossStart"><path style="stroke-width: 2; stroke-dasharray: 1, 0;" d="M 1,1 l 9,9 M 10,1 l -9,9"></path></marker><g><g></g><g><path marker-end="url(#m84bdb3482d5b94d0-m84bdb3482d5b94d0_flowchart-v2-pointEnd)" style="" id="L_Biology_Chemistry_0" d="M73.25,62L73.25,66.167C73.25,70.333,73.25,78.667,73.25,86.333C73.25,94,73.25,101,73.25,104.5L73.25,108" fill="none" stroke="currentColor"></path></g><g><g><g transform="translate(0, 0)"></g></g></g><g><g transform="translate(73.25, 35)" id="flowchart-Biology-2"><rect height="54" width="112.84375" y="-27" x="-56.421875" style="" fill="none" stroke="currentColor"></rect><g transform="translate(-26.421875, -12)" style=""><rect></rect><foreignObject height="24" width="52.84375"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><a href="https://publish.obsidian.md/Biology">Biology</a></div></foreignObject></g></g><g transform="translate(73.25, 139)" id="flowchart-Chemistry-3"><rect height="54" width="130.5" y="-27" x="-65.25" style="" fill="none" stroke="currentColor"></rect><g transform="translate(-35.25, -12)" style=""><rect></rect><foreignObject height="24" width="70.5"><div xmlns="http://www.w3.org/1999/xhtml" style="display: table-cell; white-space: nowrap; line-height: 1.5; max-width: 200px; text-align: center;"><a href="https://publish.obsidian.md/Chemistry">Chemistry</a></div></foreignObject></g></g></g></g></g></svg>

> [!note] Note
> Internal links from diagrams don't show up in the [Graph view](https://obsidian.md/help/plugins/graph).

If you have many nodes in your diagrams, you can use the following snippet.

```md
mermaid
```

This way, each letter node becomes an internal link, with the [node text](https://mermaid.js.org/syntax/flowchart.html#a-node-with-text) as the link text.

> [!note] Note
> If you use special characters in your note names, you need to put the note name in double quotes.
> 
> ```
> class "⨳ special character" internal-link
> ```
> 
> Or, `A["⨳ special character"]`.

For more information about creating diagrams, refer to the [official Mermaid docs](https://mermaid.js.org/intro/).

## Math

You can add math expressions to your notes using [MathJax](http://docs.mathjax.org/en/latest/basic/mathjax.html) and the LaTeX notation.

To add a MathJax expression to your note, surround it with double dollar signs (`$$`).

```md
$$
\begin{vmatrix}a & b\\
c & d
\end{vmatrix}=ad-bc
$$
```

$$
\begin{vmatrix} a & b \\ c & d \end{vmatrix} = a d - b c
$$

You can also inline math expressions by wrapping it in `$` symbols.

```md
This is an inline math expression $e^{2i\pi} = 1$.
```

This is an inline math expression $e^{2 i \pi} = 1$.

For more information about the syntax, refer to [MathJax basic tutorial and quick reference](https://math.meta.stackexchange.com/questions/5020/mathjax-basic-tutorial-and-quick-reference).

For a list of supported MathJax packages, refer to [The TeX/LaTeX Extension List](http://docs.mathjax.org/en/latest/input/tex/extensions/index.html).` for GitHub blobs — it captures page chrome, not the file.



## Capture metadata

- schema.org: `SoftwareSourceCode` (https://schema.org/SoftwareSourceCode)
- inbox `type`: `snippet`
- AST: not parsed in Clipper — promote later via `code-chunk.v1` / code-index
- GitHub blob source: `#read-only-cursor-text-area` / `textarea[aria-label="file content"]` (full file; visible `.react-code-line-contents` is virtualized/incomplete)
