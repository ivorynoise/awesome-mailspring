# hello-mailspring

Template plugin — shows a color bar in the message sidebar whose hue is
derived from the focused sender's email domain. It's the example from the
official Getting Started guide, rebuilt in TypeScript, and doubles as the
starting point for every new plugin in this repo.

## What it does

When you select a conversation, the contact sidebar shows a thin colored bar
under the contact card. The color is stable per sender domain (a hash of the
domain characters mapped to a hue), so mail from the same company always gets
the same color. Hover the bar to see the domain.

## Install

```bash
cd plugins/hello-mailspring
npm install
npm run build
../../scripts/link.sh hello-mailspring
```

Then restart Mailspring (or `View → Reload` when running with debug flags).
Remove it with `scripts/unlink.sh hello-mailspring`. See the
[repo README](../../README.md) for the full development workflow.

## How it works — the patterns to copy

This plugin exists to demonstrate the conventions the other plugins follow:

- **Entry point** (`src/main.tsx`) exports `activate()` / `deactivate()`,
  registering the component into a UI region by role
  (`ComponentRegistry.register(DomainColorBar, { role: 'MessageListSidebar:ContactCard' })`)
  and unregistering it on deactivate.
- **`React` is imported from `'mailspring-exports'`, never `'react'`** — the
  app injects its own React instance, and `require('react')` may not resolve
  inside a plugin.
- **Sidebar components get no `contact` prop.** `DomainColorBar` subscribes to
  `FocusedContactsStore` and re-renders when the focused contact changes
  (`src/domain-color-bar.tsx`).
- Registered components carry a unique `static displayName`, and sidebar
  columns a `static containerStyles = { order, flexShrink }`.
- **Styles** live in `styles/hello-mailspring.less`, auto-loaded by the app;
  `@import "ui-variables"` gives access to Mailspring's theme variables.
- **Typings** for the subset of `mailspring-exports` used live in
  `types/mailspring-exports.d.ts` — extend them when you use new APIs.

## Using it as a template

```bash
cp -R plugins/hello-mailspring plugins/<new-name>
```

Then in the copy: update `name` and `description` in `package.json` (no spaces
in the name — it's a node-module name), rename `styles/hello-mailspring.less`,
rewrite `src/`, and commit the `package-lock.json` (CI depends on it).
