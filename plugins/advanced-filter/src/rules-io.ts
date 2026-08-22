import {
  AccountStore,
  Actions,
  CategoryStore,
  MailRuleAction,
  MailRuleCondition,
  MailRulesStore,
  MailspringCategory,
} from 'mailspring-exports';

// Action templateKeys whose `value` is a category id (see
// Mailspring's mail-rules-templates.ts — everything else is None/InputString).
const CATEGORY_ACTION_KEYS = ['applyLabel', 'moveToLabel', 'changeFolder'];

const FILE_TYPE = 'mailspring-mail-rules';
const FILE_VERSION = 1;

interface ExportedAction extends MailRuleAction {
  // Portable identifiers alongside the machine-local category id, so a file
  // exported on one install can be imported on another (ids differ per
  // machine, paths and roles don't).
  valuePath?: string;
  valueRole?: string | null;
}

interface ExportedRule {
  accountEmail: string;
  name: string;
  disabled?: boolean;
  conditionMode: 'any' | 'all';
  conditions: MailRuleCondition[];
  actions: ExportedAction[];
}

interface RulesFile {
  type: string;
  version: number;
  exportedAt: string;
  rules: ExportedRule[];
}

export interface ImportSummary {
  imported: number;
  duplicates: number;
  skipped: string[];
}

// Two rules are duplicates when they do the same thing to the same account —
// name and id are ignored, and condition/action order doesn't matter.
function behaviorKey(
  accountId: string,
  conditionMode: string,
  conditions: MailRuleCondition[],
  actions: MailRuleAction[]
): string {
  const conds = conditions
    .map(c =>
      JSON.stringify({
        t: c.templateKey,
        c: c.comparatorKey || null,
        v: c.value === undefined ? null : c.value,
      })
    )
    .sort();
  const acts = actions
    .map(a => JSON.stringify({ t: a.templateKey, v: a.value === undefined ? null : a.value }))
    .sort();
  return JSON.stringify([accountId, conditionMode, conds, acts]);
}

export function exportAllRules(): Promise<string | null> {
  return new Promise(resolve => {
    const rules = MailRulesStore.rules();
    const exported: ExportedRule[] = [];
    for (const rule of rules) {
      const account = AccountStore.accountForId(rule.accountId);
      if (!account) {
        continue; // orphaned rule from a removed account
      }
      exported.push({
        accountEmail: account.emailAddress,
        name: rule.name,
        disabled: !!rule.disabled,
        conditionMode: rule.conditionMode,
        conditions: rule.conditions.map(c => ({
          templateKey: c.templateKey,
          comparatorKey: c.comparatorKey,
          value: c.value,
        })),
        actions: rule.actions.map(a => {
          const out: ExportedAction = { templateKey: a.templateKey, value: a.value };
          if (CATEGORY_ACTION_KEYS.includes(a.templateKey) && a.value) {
            const category = CategoryStore.byId(rule.accountId, a.value);
            if (category) {
              out.valuePath = category.path;
              out.valueRole = category.role;
            }
          }
          return out;
        }),
      });
    }

    const payload: RulesFile = {
      type: FILE_TYPE,
      version: FILE_VERSION,
      exportedAt: new Date().toISOString(),
      rules: exported,
    };

    const stamp = new Date().toISOString().slice(0, 10);
    AppEnv.showSaveDialog(
      {
        title: 'Export Mail Rules',
        defaultPath: `mailspring-rules-${stamp}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      },
      (filePath: string) => {
        if (!filePath) {
          resolve(null); // user cancelled
          return;
        }
        try {
          require('fs').writeFileSync(filePath, JSON.stringify(payload, null, 2));
          resolve(`Exported ${exported.length} rules to ${filePath}`);
        } catch (err) {
          AppEnv.showErrorDialog(`Could not write the export file: ${err.message}`);
          resolve(null);
        }
      }
    );
  });
}

function resolveAccount(email: string) {
  const direct = AccountStore.accountForEmail(email);
  if (direct) {
    return direct;
  }
  const lower = String(email || '').toLowerCase();
  return AccountStore.accounts().find(a => a.emailAddress.toLowerCase() === lower) || null;
}

function resolveCategory(accountId: string, action: ExportedAction): MailspringCategory | null {
  // Same machine: the raw id still exists.
  if (action.value) {
    const byId = CategoryStore.byId(accountId, action.value);
    if (byId) {
      return byId;
    }
  }
  const categories = CategoryStore.categories(accountId);
  if (action.valuePath) {
    const exact = categories.find(c => c.path === action.valuePath);
    if (exact) {
      return exact;
    }
    const lower = action.valuePath.toLowerCase();
    const loose = categories.find(c => c.path.toLowerCase() === lower);
    if (loose) {
      return loose;
    }
  }
  if (action.valueRole) {
    const byRole = categories.find(c => c.role === action.valueRole);
    if (byRole) {
      return byRole;
    }
  }
  return null;
}

export function importRules(): Promise<ImportSummary | null> {
  return new Promise(resolve => {
    AppEnv.showOpenDialog(
      {
        title: 'Import Mail Rules',
        properties: ['openFile'],
        filters: [{ name: 'JSON', extensions: ['json'] }],
      },
      (paths: string[]) => {
        if (!paths || paths.length === 0) {
          resolve(null); // user cancelled
          return;
        }
        let payload: RulesFile;
        try {
          payload = JSON.parse(require('fs').readFileSync(paths[0], 'utf8'));
        } catch (err) {
          AppEnv.showErrorDialog(`Could not read the file: ${err.message}`);
          resolve(null);
          return;
        }
        if (!payload || payload.type !== FILE_TYPE || !Array.isArray(payload.rules)) {
          AppEnv.showErrorDialog(
            'This file does not look like a Mailspring mail rules export ' +
              `(expected type "${FILE_TYPE}").`
          );
          resolve(null);
          return;
        }

        const summary: ImportSummary = { imported: 0, duplicates: 0, skipped: [] };
        const existingKeys = new Set(
          MailRulesStore.rules().map(r =>
            behaviorKey(r.accountId, r.conditionMode, r.conditions, r.actions)
          )
        );

        for (const rule of payload.rules) {
          const account = resolveAccount(rule.accountEmail);
          if (!account) {
            summary.skipped.push(`"${rule.name}": no account ${rule.accountEmail} on this machine`);
            continue;
          }

          const actions: MailRuleAction[] = [];
          let unresolvedFolder: string | null = null;
          for (const action of rule.actions || []) {
            if (CATEGORY_ACTION_KEYS.includes(action.templateKey)) {
              const category = resolveCategory(account.id, action);
              if (!category) {
                unresolvedFolder = action.valuePath || action.value || '(unknown)';
                break;
              }
              actions.push({ templateKey: action.templateKey, value: category.id });
            } else {
              actions.push({ templateKey: action.templateKey, value: action.value });
            }
          }
          if (unresolvedFolder) {
            summary.skipped.push(`"${rule.name}": folder/label "${unresolvedFolder}" not found`);
            continue;
          }
          if (actions.length === 0 || !Array.isArray(rule.conditions) || rule.conditions.length === 0) {
            summary.skipped.push(`"${rule.name}": has no conditions or actions`);
            continue;
          }

          const key = behaviorKey(account.id, rule.conditionMode, rule.conditions, actions);
          if (existingKeys.has(key)) {
            summary.duplicates += 1;
            continue;
          }
          existingKeys.add(key); // also dedupes within the imported file itself

          Actions.addMailRule({
            accountId: account.id,
            name: rule.name || 'Imported Rule',
            conditionMode: rule.conditionMode === 'any' ? 'any' : 'all',
            conditions: rule.conditions,
            actions,
            disabled: !!rule.disabled,
          });
          summary.imported += 1;
        }

        resolve(summary);
      }
    );
  });
}
