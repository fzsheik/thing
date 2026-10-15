# agentmascots

Animated, cursor-tracking React mascots for AI agents. Map your agent's lifecycle to a state and the mascot does the rest: spring-eased motion, eyes that follow the cursor, sparkles when a task finishes.

- Zero dependencies beyond React 19
- SVG + `requestAnimationFrame`, no canvas or WebGL
- Pauses off-screen and in background tabs, respects `prefers-reduced-motion`
- Fully typed, tree-shakeable: import one pack, ship one pack

## Install

```sh
npm i agentmascots
```

## Usage

```tsx
import { SpaceMascot } from "agentmascots/space";

export function AgentStatus({ status }: { status: "idle" | "planning" | "running" | "replying" | "done" | "away" }) {
  const state = { idle: "idle", planning: "thinking", running: "working", replying: "speaking", done: "celebrating", away: "sleeping" } as const;
  return <SpaceMascot character="luna" state={state[status]} size={96} />;
}
```

Components ship with `"use client"`, so they drop straight into Next.js App Router pages.

## Packs

| Import | Component | Style |
| --- | --- | --- |
| `agentmascots/space` | `SpaceMascot` | 13 flat space shapes |
| `agentmascots/fuzzy` | `FuzzyMascot` | Fuzz Club: 3D fur plush in CSS 3D, no WebGL |
| `agentmascots/distinguished` | `DistinguishedMascot` | Felt / plastic / plain |
| `agentmascots/sorcerers` | `SorcererMascot` | Flat vector |

The `character` prop is typed per pack, so your editor autocompletes the cast.

Pack data (characters, states, `spaceStill()` SVG strings) is safe to import in server components; only the mascot components are client components.

### Build your own

`agentmascots/plush` exports `PlushMascot`, the drawing helpers (`head`, `hair`, `spikes`, …) and every plush pack's data, so you can compose new characters. `agentmascots/motion` exports the shared spring engine and geometry helpers.

## States

`idle` · `listening` · `thinking` · `working` · `speaking` · `celebrating` · `sleeping`

## Props

| Prop | Type | Default |
| --- | --- | --- |
| `character` | pack-specific union | first character |
| `state` | see above | `"idle"` |
| `size` | `number \| string` | `96` |
| `color` | `string`, body color override | character color |
| `particleColor` | `string`, sparkles and sleep z's | pack default |
| `texture` | `"felt" \| "plastic" \| "plain"` (plush packs) | pack default |
| `track` | `boolean`, eyes follow the cursor | `true` |
| `speed` | `number`, animation speed multiplier | `1` |
| `title` | `string`, accessible label (empty = decorative) | — |
| `className` / `style` | | — |

`SpaceMascot` also takes `eyeColor` and `thoughtDots`. `FuzzyMascot` takes `character`, `state`, `size`, `color`, `track`, `speed`, `title`.

## Development

```sh
npm install
npm run dev     # watch build into dist/
npm run gen     # after adding a plush pack: regenerate its entry + exports
```

### Releasing

```sh
npm version minor        # new pack or feature (patch for fixes)
git push --follow-tags   # the tag triggers .github/workflows/publish.yml
```

Use a minor bump for breaking changes while the version is `0.x`. One-time setup so CI can publish without tokens: on npmjs.com open the package, then Settings, Trusted publishing, GitHub Actions, and enter this repo plus the workflow file `publish.yml`.

To add a plush pack: add `src/plush/packs/<name>.ts`, list it in `src/plush/packs/index.ts`, run `npm run gen` (creates the typed entry and the package exports), and add a row to the table above.

## License

MIT
