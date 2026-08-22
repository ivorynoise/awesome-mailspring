import { AccountStore, React } from 'mailspring-exports';

import AdvancedFilterSection from './advanced-filter-section';

// Wraps Mailspring's stock Preferences → Mail Rules tab component: renders it
// unchanged and appends the Advanced Filter section below. The stock tab keeps
// its selected account in private component state, so we mirror it by watching
// its account <select> (id "mail-rules-account") via a delegated DOM listener.
export default function wrapMailRulesTab(OriginalTab: any) {
  return class AdvancedFilterMailRulesTab extends React.Component<
    any,
    { accountId: string | null }
  > {
    static displayName = 'AdvancedFilterMailRulesTab';

    _el = React.createRef<HTMLDivElement>();

    state = { accountId: null };

    componentDidMount() {
      if (this._el.current) {
        this._el.current.addEventListener('change', this._onDOMChange);
      }
      this._syncAccountFromSelect();
    }

    componentWillUnmount() {
      if (this._el.current) {
        this._el.current.removeEventListener('change', this._onDOMChange);
      }
    }

    _onDOMChange = (event: Event) => {
      const target = event.target as HTMLSelectElement;
      if (target && target.id === 'mail-rules-account' && target.value) {
        const accountId = target.value;
        // This native listener fires BEFORE React's delegated onChange. A
        // synchronous setState here re-renders the stock tab, and its
        // controlled <select> resets the DOM back to the old account before
        // the stock handler reads event.target.value — the selection snaps
        // back. Defer a tick so the stock tab commits the change first.
        window.setTimeout(() => this.setState({ accountId }), 0);
      }
    };

    _syncAccountFromSelect() {
      const select = this._el.current
        ? (this._el.current.querySelector('#mail-rules-account') as HTMLSelectElement | null)
        : null;
      const firstAccount = AccountStore.accounts()[0];
      const accountId = (select && select.value) || (firstAccount && firstAccount.id) || null;
      this.setState({ accountId });
    }

    render() {
      return (
        <div className="advanced-filter-tab-wrap" ref={this._el}>
          <OriginalTab {...this.props} />
          <AdvancedFilterSection accountId={this.state.accountId} />
        </div>
      );
    }
  };
}
