import {
  CategoryStore,
  MailRulesStore,
  MailspringCategory,
  React,
} from 'mailspring-exports';

import FolderRulesRunner, { FolderRunState } from './folder-rules-runner';

// Standard mailboxes first (All Mail on top), then everything else A→Z.
const ROLE_ORDER: { [role: string]: number } = {
  all: 0,
  inbox: 1,
  important: 2,
  sent: 3,
  drafts: 4,
  archive: 5,
  spam: 6,
  trash: 7,
};

interface Props {
  accountId: string | null;
}

interface State {
  chosenCategoryId: string | null;
  chosenForAccountId: string | null;
}

export default class AdvancedFilterSection extends React.Component<Props, State> {
  static displayName = 'AdvancedFilterSection';

  state: State = { chosenCategoryId: null, chosenForAccountId: null };

  _unsubscribers: Array<() => void> = [];

  componentDidMount() {
    const refresh = () => this.forceUpdate();
    this._unsubscribers = [
      CategoryStore.listen(refresh),
      MailRulesStore.listen(refresh),
      FolderRulesRunner.listen(refresh),
    ];
  }

  componentWillUnmount() {
    this._unsubscribers.forEach(unsubscribe => unsubscribe());
  }

  _categories(): MailspringCategory[] {
    const { accountId } = this.props;
    if (!accountId) {
      return [];
    }
    return CategoryStore.categories(accountId)
      .slice()
      .sort((a, b) => {
        const rankA = a.role && ROLE_ORDER[a.role] !== undefined ? ROLE_ORDER[a.role] : 100;
        const rankB = b.role && ROLE_ORDER[b.role] !== undefined ? ROLE_ORDER[b.role] : 100;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return (a.displayName || a.path).localeCompare(b.displayName || b.path);
      });
  }

  _selectedCategory(categories: MailspringCategory[]): MailspringCategory | null {
    const { accountId } = this.props;
    const { chosenCategoryId, chosenForAccountId } = this.state;
    if (accountId && chosenForAccountId === accountId && chosenCategoryId) {
      const chosen = categories.find(c => c.id === chosenCategoryId);
      if (chosen) {
        return chosen;
      }
    }
    if (!accountId) {
      return null;
    }
    return (
      CategoryStore.getAllMailCategory(accountId) ||
      CategoryStore.getInboxCategory(accountId) ||
      categories[0] ||
      null
    );
  }

  _enabledRules() {
    const { accountId } = this.props;
    if (!accountId) {
      return [];
    }
    return MailRulesStore.rulesForAccountId(accountId).filter(r => !r.disabled);
  }

  _onProcess = (category: MailspringCategory) => {
    const rules = this._enabledRules();
    const needsBodies = rules.some(r => r.conditions.some(c => c.templateKey === 'body'));
    if (needsBodies) {
      AppEnv.showErrorDialog(
        "One or more of your mail rules requires the bodies of messages being processed. " +
          "These rules can't be run on an entire mailbox."
      );
      return;
    }
    FolderRulesRunner.start(this.props.accountId!, category);
  };

  _renderStatus(run: FolderRunState | null) {
    if (!run) {
      return null;
    }
    if (!run.done) {
      return (
        <div className="advanced-filter-status">
          <div>
            Processing <strong>{run.categoryName}</strong> —{' '}
            {run.count.toLocaleString()} messages processed
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-sm" onClick={() => FolderRulesRunner.stop(run.accountId)}>
            Stop
          </button>
        </div>
      );
    }
    return (
      <div className="advanced-filter-status">
        <div>
          Done — {run.count.toLocaleString()} messages processed in{' '}
          <strong>{run.categoryName}</strong>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-sm" onClick={() => FolderRulesRunner.clear(run.accountId)}>
          Dismiss
        </button>
      </div>
    );
  }

  render() {
    const { accountId } = this.props;
    if (!accountId) {
      return null;
    }
    const categories = this._categories();
    const selected = this._selectedCategory(categories);
    const run = FolderRulesRunner.stateFor(accountId);
    const running = !!run && !run.done;
    const hasRules = this._enabledRules().length > 0;
    const canProcess = !!selected && hasRules && !running;

    return (
      <div className="container-mail-rules advanced-filter">
        <section>
          <h6>ADVANCED FILTER</h6>
          <div className="advanced-filter-controls">
            <select
              value={selected ? selected.id : ''}
              disabled={running}
              onChange={event =>
                this.setState({
                  chosenCategoryId: event.target.value,
                  chosenForAccountId: accountId,
                })
              }
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.displayName || c.path}
                </option>
              ))}
            </select>
            <button
              className="btn"
              disabled={!canProcess}
              title={hasRules ? undefined : 'Create a mail rule above to enable this.'}
              onClick={() => selected && this._onProcess(selected)}
            >
              Process mailbox
            </button>
          </div>
          {this._renderStatus(run)}
          <p className="advanced-filter-note">
            Applies this account&rsquo;s enabled mail rules to every message in the selected
            mailbox — All Mail by default when the account has one, otherwise the inbox.
            Large mailboxes may take a while.
          </p>
        </section>
      </div>
    );
  }
}
