import { PreferencesTabItem, PreferencesUIStore } from 'mailspring-exports';

import FolderRulesRunner from './folder-rules-runner';
import wrapMailRulesTab from './wrapped-mail-rules-tab';

const TAB_ID = 'Mail Rules';

let originalTab: PreferencesTabItem | null = null;
let wrappedTab: PreferencesTabItem | null = null;
let unlisten: (() => void) | null = null;

// Replace the stock Mail Rules preferences tab with a wrapper that renders it
// plus the Advanced Filter section. The preferences package may register its
// tabs after this plugin activates, so retry on store changes until it shows.
function trySwapTab() {
  if (wrappedTab) {
    return;
  }
  const tab = PreferencesUIStore.tabs().find(t => t.tabId === TAB_ID);
  if (!tab) {
    return;
  }
  originalTab = tab;

  // The preferences root calls componentClassFn() on every render — memoize so
  // React sees a stable component class and doesn't remount the tab.
  let WrappedClass: any = null;
  wrappedTab = new PreferencesUIStore.TabItem({
    tabId: TAB_ID,
    displayName: tab.displayName,
    order: tab.order,
    componentClassFn: () => WrappedClass || (WrappedClass = wrapMailRulesTab(tab.componentClassFn())),
  });

  PreferencesUIStore.unregisterPreferencesTab(originalTab);
  PreferencesUIStore.registerPreferencesTab(wrappedTab);

  if (unlisten) {
    unlisten();
    unlisten = null;
  }
}

export function activate() {
  trySwapTab();
  if (!wrappedTab) {
    unlisten = PreferencesUIStore.listen(trySwapTab);
  }
}

export function serialize() {}

export function deactivate() {
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
  if (wrappedTab) {
    PreferencesUIStore.unregisterPreferencesTab(wrappedTab);
    if (originalTab) {
      PreferencesUIStore.registerPreferencesTab(originalTab);
    }
    wrappedTab = null;
    originalTab = null;
  }
  FolderRulesRunner.stopAll();
}
