import {
  DatabaseStore,
  MailRulesProcessor,
  MailspringCategory,
  MailspringThread,
  Message,
  Thread,
} from 'mailspring-exports';

export interface FolderRunState {
  accountId: string;
  categoryId: string;
  categoryName: string;
  count: number;
  done: boolean;
}

interface InternalRunState extends FolderRunState {
  // Timestamp (Date) of the oldest thread processed so far; batches walk
  // backwards from newest to oldest, mirroring MailRulesStore._reprocessSome.
  lastTimestamp: Date | number | null;
}

const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 500;

// Runs the account's enabled mail rules over every thread in one category
// (folder or label). Lives outside React so a run keeps going if the
// preferences sheet is closed while it's in flight.
class FolderRulesRunner {
  private _runs: { [accountId: string]: InternalRunState } = {};
  private _callbacks = new Set<() => void>();

  listen(callback: () => void): () => void {
    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  stateFor(accountId: string): FolderRunState | null {
    return this._runs[accountId] || null;
  }

  isRunning(accountId: string): boolean {
    const run = this._runs[accountId];
    return !!run && !run.done;
  }

  start(accountId: string, category: MailspringCategory) {
    this._runs[accountId] = {
      accountId,
      categoryId: category.id,
      categoryName: category.displayName || category.path,
      count: 0,
      done: false,
      lastTimestamp: null,
    };
    this._trigger();
    this._processSome(accountId);
  }

  stop(accountId: string) {
    const run = this._runs[accountId];
    if (run && !run.done) {
      run.done = true;
      this._trigger();
    }
  }

  clear(accountId: string) {
    if (this._runs[accountId]) {
      delete this._runs[accountId];
      this._trigger();
    }
  }

  stopAll() {
    this._runs = {};
    this._trigger();
  }

  private _trigger() {
    this._callbacks.forEach(cb => cb());
  }

  private _processSome(accountId: string) {
    const run = this._runs[accountId];
    if (!run || run.done) {
      return;
    }
    const matchers = [
      Thread.attributes.accountId.equal(accountId),
      Thread.attributes.categories.contains(run.categoryId),
    ];
    if (run.lastTimestamp !== null) {
      matchers.push(Thread.attributes.lastMessageReceivedTimestamp.lessThan(run.lastTimestamp));
    }
    DatabaseStore.findAll<MailspringThread>(Thread)
      .where(matchers)
      .order(Thread.attributes.lastMessageReceivedTimestamp.descending())
      .limit(BATCH_SIZE)
      .then(threads => {
        if (this._runs[accountId] !== run || run.done) {
          return;
        }
        if (threads.length === 0) {
          run.done = true;
          this._trigger();
          return;
        }
        const oldest = threads[threads.length - 1].lastMessageReceivedTimestamp;
        // Threads without a timestamp can't advance the cursor — finish
        // rather than refetching the same batch forever.
        if (!oldest) {
          run.done = true;
          this._trigger();
          return;
        }
        DatabaseStore.findAll<any>(Message)
          .where([Message.attributes.threadId.in(threads.map(t => t.id))])
          .then(messages => {
            if (this._runs[accountId] !== run || run.done) {
              return;
            }
            const advance = () => {
              if (this._runs[accountId] !== run || run.done) {
                return;
              }
              run.count += messages.length;
              run.lastTimestamp = oldest;
              this._trigger();
              setTimeout(() => this._processSome(accountId), BATCH_PAUSE_MS);
            };
            MailRulesProcessor.processMessages(messages).then(advance, advance);
          });
      });
  }
}

export default new FolderRulesRunner();
