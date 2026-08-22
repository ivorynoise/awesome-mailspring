declare module 'mailspring-exports'
{
	interface Attribute
	{
		equal(val: any): Matcher;
		not(val: any): Matcher;
		contains(val: string): Matcher;
		containsAny(val: string[]): Matcher;
		in(val: any[]): Matcher;
		notIn(val: any[]): Matcher;
		greaterThan(val: any): Matcher;
		lessThan(val: any): Matcher;
		greaterThanOrEqualTo(val: any): Matcher;
		lessThanOrEqualTo(val: any): Matcher;
		gt(val: any): Matcher;
		lt(val: any): Matcher;
		gte(val: any): Matcher;
		lte(val: any): Matcher;
		like(val: string): Matcher;
		startsWith(val: string): Matcher;
		descending(): SortDescriptor;
		ascending(): SortDescriptor;
	}

	interface Matcher
	{
	}

	const Matcher:
	{
		Or(matchers: Matcher[]): Matcher;
		And(matchers: Matcher[]): Matcher;
		Not(matchers: Matcher[]): Matcher;
		Search(query: string): Matcher;
	};
	interface SortDescriptor { }

	interface ModelQuery<T> extends Promise<T[]>
	{
		where(matchers: Matcher[]): ModelQuery<T>;
		whereAny(matchers: Matcher[]): ModelQuery<T>;
		search(query: string): ModelQuery<T>;
		order(sort: SortDescriptor | SortDescriptor[]): ModelQuery<T>;
		limit(n: number): ModelQuery<T>;
		offset(n: number): ModelQuery<T>;
		include(attr: Attribute): ModelQuery<T>;
		includeAll(): ModelQuery<T>;
		count(): Promise<number>;
		one(): Promise<T | null>;
	}

	interface SingleModelQuery<T> extends Promise<T | null>
	{
		include(attr: Attribute): SingleModelQuery<T>;
		includeAll(): SingleModelQuery<T>;
	}

	interface ModelAttributes
	{
		[key: string]: Attribute;
	}

	interface MailspringContact
	{
		name: string;
		email: string;
	}

	interface MailspringFolder
	{
		id: string;
		path: string;
		role: string;
		displayName: string;
		accountId: string;
	}

	interface MailspringLabel
	{
		id: string;
		path: string;
		role: string;
		displayName: string;
		accountId: string;
	}

	interface MailspringFile
	{
		id: string;
		filename: string;
		contentType: string;
		size: number;
	}

	interface MailspringThread
	{
		id: string;
		accountId: string;
		subject: string;
		snippet: string;
		unread: boolean;
		starred: boolean;
		firstMessageTimestamp: number;
		// Note: hydrated models hold a Date here; use .valueOf() to compare.
		lastMessageReceivedTimestamp: number | Date;
		lastMessageSentTimestamp: number | Date;
		participants: MailspringContact[];
		attachmentCount: number;
		folders: MailspringFolder[];
		labels: MailspringLabel[];
		categories: any[];
		messages(opts?: { includeHidden?: boolean }): Promise<MailspringMessage[]>;
	}

	interface MailspringMessage
	{
		id: string;
		accountId: string;
		subject: string;
		snippet: string;
		date: number;
		draft: boolean;
		unread: boolean;
		starred: boolean;
		threadId: string;
		body: string;
		from: MailspringContact[];
		to: MailspringContact[];
		cc: MailspringContact[];
		bcc: MailspringContact[];
		replyTo: MailspringContact[];
		files: MailspringFile[];
		folder: MailspringFolder | null;
		plaintext: boolean;
		replyToHeaderMessageId: string | null;
		headerMessageId: string;
	}

	interface MailspringAccount
	{
		id: string;
		name: string;
		label: string;
		emailAddress: string;
		provider: string;
		usesLabels(): boolean;
	}

	const AccountStore:
	{
		accounts(): MailspringAccount[];
		accountForId(id: string): MailspringAccount | null;
		accountForEmail(email: string): MailspringAccount | null;
		// Returns an unsubscribe function.
		listen(callback: () => void): () => void;
	};

	// A Gmail label or an IMAP folder. CategoryStore returns both through the
	// same shape; which one an account uses is decided by `usesLabels()`.
	interface MailspringCategory
	{
		id: string;
		path: string;
		role: string | null;
		displayName: string;
		accountId: string;
		isLockedCategory(): boolean;
	}

	const CategoryStore:
	{
		byId(accountOrId: string, categoryId: string): MailspringCategory | null;
		categories(accountOrId?: string | null): MailspringCategory[];
		getCategoryByRole(accountOrId: string, role: string): MailspringCategory | null;
		getAllMailCategory(accountOrId: string): MailspringCategory | null;
		getInboxCategory(accountOrId: string): MailspringCategory | null;
		getTrashCategory(accountOrId: string): MailspringCategory | null;
		// Returns an unsubscribe function.
		listen(callback: () => void): () => void;
	};

	interface MailRuleCondition
	{
		templateKey: string;
		comparatorKey?: string;
		value?: string;
	}

	interface MailRuleAction
	{
		templateKey: string;
		value?: string;
	}

	interface MailRuleRecord
	{
		id: string;
		accountId: string;
		name: string;
		disabled?: boolean;
		disabledReason?: string;
		conditionMode: 'any' | 'all';
		conditions: MailRuleCondition[];
		actions: MailRuleAction[];
	}

	const MailRulesStore:
	{
		rules(): MailRuleRecord[];
		rulesForAccountId(accountId: string): MailRuleRecord[];
		disabledRules(accountId?: string): MailRuleRecord[];
		// Returns an unsubscribe function.
		listen(callback: () => void): () => void;
	};

	// Runs the enabled mail rules against hydrated Message models. Rules whose
	// accountId doesn't match a message are skipped internally.
	const MailRulesProcessor:
	{
		processMessages(messages: MailspringMessage[]): Promise<void>;
	};

	interface MailRuleTemplate
	{
		key: string;
		name: string;
		type: 'String' | 'Enum' | 'None' | 'InputString';
		comparators: Record<string, { name: string }>;
		values?: { name: string; value: string }[];
	}

	const MailRulesTemplates:
	{
		ConditionTemplates: MailRuleTemplate[];
		ActionTemplates: MailRuleTemplate[];
		ConditionMode: { Any: 'any'; All: 'all' };
	};

	interface PreferencesTabItemOpts
	{
		tabId: string;
		displayName: string;
		componentClassFn: () => any;
		order?: number;
	}

	interface PreferencesTabItem extends PreferencesTabItemOpts
	{
		order: number;
	}

	const PreferencesUIStore:
	{
		TabItem: new (opts: PreferencesTabItemOpts) => PreferencesTabItem;
		tabs(): PreferencesTabItem[];
		selection(): { tabId: string | null; accountId: string | null };
		registerPreferencesTab(tab: PreferencesTabItem): void;
		unregisterPreferencesTab(tabOrId: PreferencesTabItem | string): void;
		// Returns an unsubscribe function.
		listen(callback: () => void): () => void;
	};

	interface MailspringContactRecord
	{
		id: string;
		email: string;
		name: string;
		refs: number;
		hidden: boolean;
		source: string;
	}

	interface ModelClass<T>
	{
		attributes: Record<string, Attribute>;
	}

	const Thread: ModelClass<MailspringThread>;
	const Message: ModelClass<MailspringMessage>;
	const Contact: ModelClass<MailspringContactRecord>;
	const Folder: ModelClass<MailspringFolder>;
	const Label: ModelClass<MailspringLabel>;

	const DatabaseStore:
	{
		find<T>(klass: ModelClass<T>, id: string): SingleModelQuery<T>;
		findBy<T>(klass: ModelClass<T>, predicates: Matcher[]): SingleModelQuery<T>;
		findAll<T>(klass: ModelClass<T>): ModelQuery<T>;
		count<T>(klass: ModelClass<T>, predicates?: Matcher[]): Promise<number>;
		run<T>(query: ModelQuery<T>): Promise<T[]>;
	};

	interface DraftChangeSet
	{
		add(changes: Record<string, unknown>, options?: { skipSaving?: boolean }): void;
		commit(): Promise<void>;
		isDirty(): boolean;
		dirtyFields(): string[];
	}

	interface DraftEditingSession
	{
		headerMessageId: string;
		changes: DraftChangeSet;
		draft(): MailspringMessage | null;
		prepare(): Promise<MailspringMessage | void>;
	}

	const Actions:
	{
		destroyDraft(opts: { accountId: string; headerMessageId: string; id?: string }): void;
		addMailRule(properties: Partial<MailRuleRecord> & { accountId: string }): void;
		updateMailRule(id: string, properties: Partial<MailRuleRecord>): void;
		deleteMailRule(id: string): void;
		reorderMailRule(id: string, newIdx: number): void;
	};

	const DraftStore:
	{
		sessionForClientId(headerMessageId: string): Promise<DraftEditingSession>;
		isSendingDraft(headerMessageId: string): boolean;
	};

	const QuotedHTMLTransformer:
	{
		hasQuotedHTML(html: string): boolean;
		removeQuotedHTML(html: string, options?: { keepIfWholeBodyIsQuote?: boolean }): string;
		appendQuotedHTML(htmlWithoutQuotes: string, originalHTML: string): string;
	};

	const ComponentRegistry:
	{
		register(component: any, options: { role: string }): void;
		unregister(component: any): void;
	};

	// Mailspring provides its own React instance to plugins — always import
	// React/PropTypes from 'mailspring-exports', never from 'react'.
	const React: typeof import('react');
	const PropTypes: any;

	interface FocusedContact extends MailspringContact
	{
		displayName(): string;
	}

	// Tracks the currently selected person in the message sidebar.
	const FocusedContactsStore:
	{
		focusedContact(): FocusedContact | null;
		// Returns an unsubscribe function.
		listen(callback: () => void): () => void;
	};
}

// Global injected by Mailspring into every window.
declare const AppEnv:
{
	showErrorDialog(message: string | { title: string; message: string }): void;
	isMainWindow(): boolean;
} & Record<string, any>;
