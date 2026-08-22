// React must be imported from mailspring-exports, NOT from 'react' —
// Mailspring provides its own React instance to plugins at runtime.
import { React, FocusedContactsStore, FocusedContact } from 'mailspring-exports';

interface State {
  contact: FocusedContact | null;
}

// The example from the official Getting Started guide: a bar whose hue is
// derived from the sender's email domain. Sidebar components don't receive
// the contact as a prop — they listen to FocusedContactsStore, which tracks
// the currently selected person in the conversation. If you need to fetch
// your own data per-contact, create your own store:
// FocusedContactsStore => Your Store => Your Component
export default class DomainColorBar extends React.Component<{}, State> {
  // Assign a unique displayName to avoid naming conflicts when injecting.
  static displayName = 'DomainColorBar';

  // Tells the app how to constrain the column this component renders in.
  static containerStyles = {
    order: 1,
    flexShrink: 0,
  };

  unsubscribe?: () => void;

  constructor(props: {}) {
    super(props);
    this.state = { contact: FocusedContactsStore.focusedContact() };
  }

  componentDidMount() {
    this.unsubscribe = FocusedContactsStore.listen(() => {
      this.setState({ contact: FocusedContactsStore.focusedContact() });
    });
  }

  componentWillUnmount() {
    if (this.unsubscribe) this.unsubscribe();
  }

  render() {
    const { contact } = this.state;
    if (!contact || !contact.email) {
      return <div className="domain-color-bar" />;
    }

    const domain = contact.email.split('@')[1] || '';
    const hue =
      (domain.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 36) * 10;

    return (
      <div
        className="domain-color-bar"
        title={domain}
        style={{ background: `hsl(${hue}, 62%, 57%)` }}
      />
    );
  }
}
