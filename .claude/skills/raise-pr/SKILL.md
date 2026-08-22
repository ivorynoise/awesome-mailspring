---
name: raise-pr
description: Raise a PR the repo way — find or create the GitHub issue it addresses, keep the PR small (one bug/feature), and stack it on the open PR it builds on. Use whenever creating a pull request, shipping/landing work, or asked to "raise a PR" in this repo.
---

# Raise a PR (issue-first, small, stacked)

Every change in this repo ships as a **small PR that references a GitHub
issue** and, when it builds on unmerged work, is **stacked** on that work's
branch instead of waiting for it to merge. Follow these steps in order.

## 1. Scope: one PR = one bug or one feature

A PR fixes one bug or delivers one feature — small or big, but singular.
If the work in hand contains two separable concerns, split it: ship the
first, then stack the second on top (step 3). Never grow an open PR with
unrelated commits; raise a follow-up stacked PR instead. (An exception:
a bug discovered in and fixed by the same branch may ride along, but it
still gets its own issue and a `Fixes #N` line in the PR body.)

## 2. Issue first: find or create, then reference

Before creating the PR, make sure the issue exists:

```bash
gh issue list --state all --search "<keywords>"
```

- **Found one that genuinely matches** → reference it. Don't stretch a
  loosely related issue to fit.
- **None matches** → create it first. A good issue states the problem
  (and for bugs, the cause if known) before the solution:

```bash
gh issue create --title "<component>: <problem>" --body "..."
```

Reference the issue from the PR body (and ideally the final commit) with
`Closes #N` (features) or `Fixes #N` (bugs) so merging auto-closes it.
One issue per concern — a PR may close several small issues, but never
zero.

## 3. Base: stack on unmerged work you build on

Stacked PRs are chains of dependent PRs: each branch starts from the
previous PR's branch, and each PR's **base** is set to that branch, so
every PR's diff shows only its own work and review never blocks on a
merge. Check what's open:

```bash
gh pr list --state open
```

- Work **builds on an open PR** (touches the same plugin/files, or needs
  its commits) → branch from that PR's branch and create the PR with
  `--base <that-branch>`. Say `Stacked on #X` at the top of the body.
- Independent work → base `main`.
- Never commit to `main` directly — it's protected by CODEOWNERS review.

**When the base PR merges** (this repo squash-merges):

```bash
git fetch origin
git rebase --onto origin/main <old-base-tip-sha>   # drop the squashed commits
git push --force-with-lease origin HEAD:<branch>
```

GitHub retargets the stacked PR to `main` automatically when the merged
base branch is deleted — verify with `gh pr view <n>`, and retarget with
`gh pr edit <n> --base main` if it didn't.

## 4. Branch, verify, push, create

- Branch names: `feat/<slug>` or `fix/<slug>`.
- Before pushing: `npm run build` must pass in every touched plugin; a
  new plugin commits its `package-lock.json` (CI depends on it).
- From a worktree, push explicitly: `git push origin HEAD:<branch>`.
- Create the PR:

```bash
gh pr create --head <branch> --base <base> --title "..." --body "..."
```

PR body: what changed and why, `Closes #N` / `Fixes #N`, `Stacked on #X`
if stacked, and how it was tested. Keep the title in the form
`<component>: <change>` for plugin work.
