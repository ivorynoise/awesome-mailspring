# awesome-mailspring

A collection of Mailspring plugins adding functionality the app is missing.
Each plugin lives in `plugins/<name>/` and is installed by symlinking it into
Mailspring's `packages` directory.

## Prerequisites

- [Mailspring](https://getmailspring.com/) installed and signed in
- Node.js (for `npm install` / `tsc`)
- A clone of the original Mailspring source next to this repo — it's the
  reference for every API a plugin touches (`app/src`,
  `app/internal_packages`, `PLUGIN_SYSTEM_ARCHITECTURE.md`):

  ```bash
  git clone https://github.com/Foundry376/Mailspring.git ../Mailspring
  ```

## Developing

Run Mailspring in dev mode for better error logging and hot reloading:
open the `Developer` menu → `Run with debug flags...`
(see the [Getting Started guide](https://foundry376.github.io/Mailspring/guides/GettingStarted.html)).

## Building & installing a plugin

```bash
cd plugins/hello-mailspring
npm install
npm run build          # or: npm run watch
../../scripts/link.sh hello-mailspring
```

Then restart Mailspring (or `View → Reload` in dev mode).

To remove a plugin:

```bash
scripts/unlink.sh hello-mailspring
```

## Creating a new plugin

Copy the template and rename it:

```bash
cp -R plugins/hello-mailspring plugins/<new-name>
```

Then in the new directory:

1. Update `name` and `description` in `package.json`
2. Rename `styles/hello-mailspring.less`
3. Write your code in `src/` — the entry point must export `activate()` and
   `deactivate()` (see `src/main.tsx`)

Mailspring loads `main` from `package.json` (`./lib/main`), which is the
compiled output of `src/` — always build before linking.

## CI & releases

CI (`.github/workflows/ci.yml`) builds only the plugins changed by a push/PR —
the job matrix is discovered from `plugins/`, so new plugins need no workflow
edits.

To release a plugin (`.github/workflows/release.yml`), bump `version` in its
`package.json`, then push a matching tag:

```bash
git tag hello-mailspring-v0.1.0
git push origin hello-mailspring-v0.1.0
```

The workflow verifies the tag matches `package.json`, builds, prunes dev
dependencies, and attaches `<plugin>-v<version>.zip` to a GitHub Release —
installable via Mailspring's `Install a Plugin...` without building.

## Plugin anatomy

```
plugins/<name>/
├── package.json        # name, main: ./lib/main, engines.mailspring
├── tsconfig.json       # compiles src/ → lib/
├── src/                # TypeScript source
│   └── main.tsx        # exports activate() / deactivate()
├── styles/             # .less files, loaded automatically
├── types/              # ambient typings for 'mailspring-exports'
└── lib/                # compiled JS (gitignored, built via tsc)
```

Key APIs (all from `mailspring-exports`, provided by the app at runtime):

- `React` / `PropTypes` — **always import these from `mailspring-exports`**,
  never from `'react'`; Mailspring injects its own React instance
- `ComponentRegistry` — inject React components into UI regions by role
  (e.g. `MessageListSidebar:ContactCard`, `Composer:ActionButton`)
- `FocusedContactsStore` — the contact currently selected in the sidebar
- `DatabaseStore` + models (`Thread`, `Message`, `Contact`, ...) — query mail data
- `Actions` — dispatch/observe app actions

The typings in `types/mailspring-exports.d.ts` cover a useful subset; extend
them as needed.

### package.json options

- `windowTypes` — which windows load the plugin. Keys: `default` (main window),
  `composer`, `thread-popout`, `calendar`. If omitted, the plugin loads nowhere.
  Only add types you actually register components for.
- `syncInit: true` — activate immediately on startup instead of the default
  ~2s delayed load. Use only if other components depend on your plugin at
  startup; it slows launch.

### Constraints & references

- Mailspring does not transpile plugin code — ship compiled ES2017 JS in `lib/`.
  `lib/` is gitignored here since we install via symlink and build locally, but
  to distribute a plugin to others, include the built `lib/` (they install via
  `Install a Plugin...` without building).
- External npm dependencies must be present in the plugin's `node_modules`;
  **native modules (anything with `binding.gyp`) are not supported**.
- Best reference code: Mailspring's own
  [internal packages](https://github.com/Foundry376/Mailspring/tree/master/app/internal_packages)
  (`composer-translate`, `composer-templates`, `phishing-detection` are good
  starting points), and the official
  [Mailspring-Plugin-Starter](https://github.com/Foundry376/Mailspring-Plugin-Starter).
  With the source cloned at `../Mailspring` (see Prerequisites) these are all
  readable locally.

## Plugins

| Plugin | Status | Description |
|---|---|---|
| `hello-mailspring` | template | Sender-domain color bar in the message sidebar (from the official guide) |
| `advanced-filter` | working | Run an account's mail rules on any mailbox: adds a folder picker + "Process mailbox" button below Preferences → Mail Rules (defaults to All Mail, falls back to Inbox) |
