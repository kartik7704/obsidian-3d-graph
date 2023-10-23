## Obsidian 3D Graph (Yomaru)

![Obsidian 3D graph](https://github.com/HananoshikaYomaru/obsidian-3d-graph/assets/43137033/c8a501e8-c5b6-4622-b5df-2a2335609cae)

> This is a fork from the original https://github.com/AlexW00/obsidian-3d-graph.
>
> ⚠️ This plugin is still under early development. Please open github issue if you have problems.
>
> ⚠️ I need open source contributors to help with the force! I have no idea why the built in center force is not enough to hold nodes together. 💩

A 3D Graph for Obsidian with dozen of features!

see the demo: https://www.youtube.com/watch?v=HnqXH6z4WrY

## Installation

### through BRAT

1. install the BRAT plugin
2. go to the plugin option, add beta plugin, copy and paste the link of this repo
3. the plugin will automatically appear in the list of installed community plugins, enabled this plugin

### Manual installation

1. cd to `.obsidian/plugins`
2. git clone this repo
3. `cd obsidian-3d-graph && bun install && bun run build`
4. there you go 🎉

## Features

### Global Graph

Use ribbon button or command to open the global graph.

You can do zooming (scroll you wheel), rotating (drag the scene) and panning (ctrl/cmd and drag the scene) in the graph.

> ⚠️ 3D graph has Performance issue that I don't know how to fix. You can set the max node number limit on the plugin setting. If the total node number on the graph beyond the limit, the graph will not be rendered to protect your computer from hanging.

### Local Graph

> ⚠️ Local graph currently has some problem. I want to focus on global graph first and therefore I disable it.

In a note, you can run command `Open local 3D graph` to open a local graph. A local graph will only show nodes that connect to this nodes.

### Filter Node on global graph

1. filter by query
2. filter attachment
   1. definition of attachment: any files which are not markdown files
3. filter orphans
   1. definition of orphans: any node that has no links IN THE CURRENT GRAPH

### Group and color nodes on global graph

you can use query to color nodes on a global graph

### Label fade

When you are closer to the node, the label will appear. When you move away from the node, the node will fade away.

### Changing display setting

You can change the following:

1. Node size
   1. Node size also scale with degree of connection. The more links a node has, the bigger it is.
2. Link thickness
3. Link distance
4. Node repulsion
5. node hover color, node hover neighbour color, link hover color
6. show file extension, show full path on label
7. show center coordination
8. show link arrow
9. don't node move on drag

### Focus on node

hold `Ctrl`/`cmd` and click on a node will fly and focus on a node. It is the perfect way to navigate on large graph.

### Search and focus

You can search and focus on a node in the graph

### Multiple selection and batch commands

hold `shift` and click on nodes to select multiple nodes. Then right click on one of the selected nodes to open commands. You can run batched commands on the selected nodes.

### DAG mode

You can see DAG(Directed acyclic graph) orientation on a graph.

> ⚠️ Currently Dag mode has some issue, it cannot handle circular nodes and links but the plugin doesn't reflect that.

### Feature roadmap

1. Save Setting, you will be able to save setting for future use
2. Algorithm optimization and code best practice enforcement (but not graph performance optimization because I don't want to dig deep in d3)
3. Searching enhancement, now use a lot of hacky why to make obsidian built in search bar work but new mechanism will be introduced in the future.
4. local graph option, currently local graph has not setting.

some other uncertain features are will sit in the github issues but I work on them base on ICE (Impact, confidence, effort)

## Development

1. cd to `.obsidian/plugins`
2. git clone this repo
3. `cd obsidian-3d-graph && bun install && bun run dev`
4. there you go 🎉

for release, just run `bun release`

## Note

1. I have been developing this for free. I try to prioritize the functions before fanciness. I also prioritize my tasks base on ICE (Impact, Confidence, Effort).
2. I have other on-going projects. I need open source helpers. Sponsorship will give me motivation and code contributors are very appreciate. I am open for discussion through https://cal.com/manlung.
3. If you have an question or feature request, please open Github issues.

## Say thank you

If you are enjoying this plugin then please support my work and enthusiasm by buying me a coffee on https://www.buymeacoffee.com/yomaru.

<a href="https://www.buymeacoffee.com/yomaru" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Acknowledgement

Just want to say thanks to those people. Without them, this repo will not be here.

1. The original repo: https://github.com/AlexW00/obsidian-3d-graph
2. The 3d force graph by @vasturiano: https://github.com/vasturiano/3d-force-graph
