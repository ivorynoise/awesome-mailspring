# advanced-filter

Run an account's mail rules on any mailbox. Mailspring's built-in
"Process entire inbox" button only ever processes the inbox; this plugin adds
an **Advanced Filter** section below **Preferences → Mail Rules** with a
mailbox picker and a **Process mailbox** button, so rules can be applied to
All Mail, Archive, or any folder/label after the fact.

## What it does

- Adds a folder/label picker listing every mailbox in the selected account —
  standard mailboxes first (All Mail on top), then the rest alphabetically.
- Defaults to **All Mail** when the account has one (Gmail), otherwise the
  Inbox.
- **Process mailbox** runs the account's *enabled* mail rules over every
  message in the chosen mailbox, newest first, showing a live count with a
  **Stop** button. The run keeps going if you close the preferences window.
- Rules with a "body contains" condition are refused up front — message
  bodies aren't available in bulk, matching Mailspring's own behavior for
  inbox reprocessing.

## Install

```bash
cd plugins/advanced-filter
npm install
npm run build
../../scripts/link.sh advanced-filter
```

Then restart Mailspring (or `View → Reload` when running with debug flags).
Remove it with `scripts/unlink.sh advanced-filter`. See the
[repo README](../../README.md) for the full development workflow.

## How it works

- **`src/main.ts`** — swaps the stock Mail Rules preferences tab for a wrapper
  via `PreferencesUIStore`: it unregisters the original `TabItem` and
  registers one whose component renders the original tab plus the Advanced
  Filter section. The preferences package may register its tabs after this
  plugin activates, so the swap retries on store changes until the tab shows
  up. `deactivate()` restores the original tab.
- **`src/wrapped-mail-rules-tab.tsx`** — the wrapper component. The stock tab
  keeps its selected account in private state, so the wrapper mirrors it by
  watching the tab's account `<select>` with a delegated DOM listener and
  passes the account id down to the section.
- **`src/advanced-filter-section.tsx`** — the picker + button UI. Reads
  mailboxes from `CategoryStore` and rules from `MailRulesStore`; the button
  is disabled while a run is active or when the account has no enabled rules.
- **`src/folder-rules-runner.ts`** — a singleton that lives outside React so
  runs survive the preferences sheet closing. It pages through the mailbox's
  threads 50 at a time (newest → oldest, cursoring on
  `lastMessageReceivedTimestamp`, mirroring `MailRulesStore._reprocessSome`
  in Mailspring core), loads each batch's messages, feeds them to
  `MailRulesProcessor.processMessages()`, and pauses 500 ms between batches
  to keep the UI responsive.

## Caveats

- One run per account at a time; starting a new run replaces the previous
  run's status.
- Large mailboxes take a while — tens of thousands of messages means minutes,
  by design (batching + pauses keep Mailspring usable meanwhile).
- The processed count is messages *examined*, not messages a rule matched.
- Rule actions are applied through Mailspring's normal task queue, so changes
  sync back to the mail server as usual and are individually undoable from
  the activity log, but there is no bulk "undo this run".
