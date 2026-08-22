import { ComponentRegistry } from 'mailspring-exports';

import DomainColorBar from './domain-color-bar';

// Called when the plugin is loaded. Register components into UI regions here.
export function activate() {
  ComponentRegistry.register(DomainColorBar, { role: 'MessageListSidebar:ContactCard' });
}

// Optional: called when the plugin is about to be unmounted. Return a state
// object and it will be passed back to activate() on the next launch.
export function serialize() {}

// Called when the plugin is disabled or Mailspring shuts down. Undo activate().
export function deactivate() {
  ComponentRegistry.unregister(DomainColorBar);
}
