# Project context for new feature work

Read `TECHNICAL_DOC.md` first for the plugin's component architecture (settings manager,
global/local graph views, force graph, interaction manager, graph commands).

This is a fork of an upstream Obsidian 3D graph plugin, extended with a custom **ring
system**: notes tagged `ring` (with `ring-filter` + `radius` + `ring-normal` frontmatter)
arrange their children on a tilted plane, computed in `RingManager.ts`. Camera work lives in
`ForceGraphEngine.ts`, rendering/raycasting/click-picking in `ForceGraph.ts`. This sandbox
copy (`inkspace/`) is for the freecam + spatial-notes feature — the original plugin at
`../Obsidian 3d graph/obsidian-3d-graph/` should not be touched.

## Conventions worth matching, not reinventing

- **Frontmatter is the source of truth for persisted state, not `positions.json`.** The ring
  system reads `graph_pos`/`ring-normal` from frontmatter first, falls back to
  `positions.json` only if frontmatter's absent (`getEffectivePosition()` pattern). If the
  new note-placement feature needs to persist anything (a note's 3D position, its
  expanded/collapsed state), follow this same frontmatter-first convention rather than
  inventing a separate storage mechanism.
- **Writes need to actually persist, not just update in-memory state.** Past bugs here came
  specifically from updating a node's in-memory position without writing it to frontmatter —
  it would look correct until the next reload, then silently revert. Any new state this
  feature introduces should get the same "write it, don't just hold it in memory" treatment.

## Real gotchas from past incidents

- **Don't assume a third-party library setter is side-effect-free.** `three-forcegraph`'s
  `dagMode()` setter had a genuine bug where calling it at all — even with a real `null` —
  triggered an internal reheat that silently cleared every node's pinned position. Test
  unfamiliar library setters thoroughly (log before/after state) rather than trusting them
  by inspection alone, especially anything from `three-forcegraph` specifically.
- **Don't hand-edit plugin data files while Obsidian is running.** Obsidian keeps its own
  in-memory state and flushes it back to disk on its own save cycle (e.g. on close) —
  direct file edits made while the app is open can get silently clobbered by that flush.
  Only relevant if testing/development involves editing plugin data files directly rather
  than through the running plugin's own UI.

## What NOT to touch

Nothing in the ring system itself needs to change for this feature — freecam and the
spatial-note/ESP-box system are additive, not a replacement for how ring-based nodes work.
