# awesome-mailspring

A monorepo of independent Mailspring plugins, each adding functionality the
app is missing. This file records the rationale behind the layout and the
Mailspring-specific rules that aren't obvious from the code.

## Architecture

```
plugins/<name>/          one self-contained Mailspring plugin per directory
├── package.json         main: ./lib/main · engines.mailspring · windowTypes
├── tsconfig.json        compiles src/ → lib/ (ES2017 + CommonJS + React JSX)
├── src/                 TypeScript source (entry exports activate/deactivate)
├── styles/              .less, auto-loaded; @import "ui-variables" for theming
├── types/               ambient typings for 'mailspring-exports'
└── lib/                 compiled JS — gitignored, built via `npm run build`
scripts/link.sh          symlinks one plugin into Mailspring's packages dir
scripts/unlink.sh        removes that symlink
.github/workflows/       CI matrix + tag-driven release packaging
```

### Why this shape

- **One repo, many plugins; installed individually.** Mailspring treats each
  directory in its `packages/` folder as one plugin, loaded in isolation by
  its `main` entry. We develop in the repo and symlink individual plugins in
  (`scripts/link.sh <name>`), so any subset can be installed, toggled, or
  shared independently — one feature crashing can't take down the rest.
  Mailspring itself uses this structure (`app/internal_packages`).
- **No workspaces/monorepo tooling.** Plugins can't share code at runtime
  (isolated loading), so per-directory `npm` is deliberate. Don't add
  turborepo/nx/workspaces until a shared library actually exists.
- **`lib/` is gitignored.** Symlink installs build locally; distribution
  happens through the release workflow, which ships built `lib/` in a zip.
  Mailspring does NOT transpile plugin code or run `npm install` — a plugin
  must ship compiled ES2017 JS plus production `node_modules`.
- **Conventions mirror the working `mailspring-mcp` plugin** (installed at
  `~/Library/Application Support/Mailspring/packages/`) and the official
  [Mailspring-Plugin-Starter](https://github.com/Foundry376/Mailspring-Plugin-Starter),
  which is more current than the Getting Started guide (the guide still shows
  the Nylas-era CoffeeScript template).

## Mailspring reference source

A full checkout of [Foundry376/Mailspring](https://github.com/Foundry376/Mailspring)
is expected one directory up from this repo, at `../Mailspring` (relative to
the main checkout — from a git worktree, resolve against the original repo
root). **If it exists, use it** to answer any Mailspring API question — store
methods, `mailspring-exports` members, model attributes, preferences tabs:
grep/read `../Mailspring/app/src/**` and `../Mailspring/app/internal_packages/**`;
the repo root also has `PLUGIN_SYSTEM_ARCHITECTURE.md`. Only fall back to
extracting compiled JS from the installed app
(`/Applications/Mailspring.app/Contents/Resources/app.asar`) when the checkout
is missing, or to confirm the installed version matches it. Never guess an API
from memory — verify in source, and extend the plugin's
`types/mailspring-exports.d.ts` from what you find.

## Mailspring rules (violations fail silently at runtime)

- **Import `React`/`PropTypes` from `'mailspring-exports'`, never `'react'`.**
  The app injects its own React instance; `require('react')` may not resolve.
- **`windowTypes` in package.json is required** — omit it and the plugin
  loads in no window at all, with no error. `default` is the main window;
  others: `composer`, `thread-popout`, `calendar`. Only add what you use.
- **Sidebar components get no `contact` prop** — subscribe to
  `FocusedContactsStore` (see `plugins/hello-mailspring/src/domain-color-bar.tsx`).
  Give registered components a unique `static displayName` and, for sidebar
  columns, `static containerStyles = { order, flexShrink }`.
- **No native node modules** (anything with `binding.gyp`) — Mailspring
  doesn't support them in plugins.
- **`syncInit: true`** makes a plugin load at startup instead of ~2s later;
  use only when other components depend on it at launch (it slows startup).
- The typings in each plugin's `types/mailspring-exports.d.ts` are
  hand-maintained (originally from mailspring-mcp) — extend them when using
  new APIs rather than falling back to `any`.

## Contribution workflow (issue-first, small, stacked PRs)

Development here is a stream of small PRs, each fixing one bug or shipping
one feature. Before raising any PR, invoke the `raise-pr` skill
(`.claude/skills/raise-pr/SKILL.md`) and follow it. The short version:

- **Issue first.** Every PR references a GitHub issue (`Closes #N` /
  `Fixes #N`). Search existing issues; create one if none matches.
- **Stacked PRs are preferred.** Work that builds on an unmerged PR branches
  from that PR's branch and sets it as the PR base, so review never blocks on
  a merge. After the base squash-merges, `git rebase --onto origin/main` and
  force-push (with lease).
- **Keep PRs small.** New concerns become follow-up stacked PRs, not extra
  commits on an open one. `main` is protected (CODEOWNERS review required).

## Workflows

- **New plugin**: copy `plugins/hello-mailspring`, rename (no spaces — plugin
  names are node-module names), update `package.json` name/description,
  rename the styles file. Commit its `package-lock.json` — CI's `npm ci` and
  cache depend on it.
- **Develop**: `npm run watch` in the plugin + `scripts/link.sh <name>`;
  run Mailspring via `Developer → Run with debug flags...` and reload
  (`View → Reload`) to pick up changes.
- **CI** (`ci.yml`): builds only plugins touched by the push/PR — the matrix
  is discovered from the diff, so new plugins need no workflow edits. No
  usable diff base (new branch/force push) → builds everything.
- **Release** (`release.yml`): bump `version` in the plugin's package.json,
  then tag `<plugin>-v<version>` and push the tag. The workflow fails if tag
  and package.json versions disagree, then builds, prunes dev deps, and
  attaches an install-ready zip to a GitHub Release.
