const PREFS_KEY = 'ldo2_preferences';

export interface UserPreferences {
  theme: 'dark' | 'light' | 'system';
  sidebarExpanded: boolean;
  defaultView: string;
  workLedgerColumns: string[];
  documentHubColumns: string[];
  workLedgerPageSize: number;
  documentHubPageSize: number;
  lastVisitedPath: string;
}

const DEFAULTS: UserPreferences = {
  theme: 'dark',
  sidebarExpanded: true,
  defaultView: '/',
  workLedgerColumns: ['id', 'description', 'category', 'plOffice', 'status', 'kpi', 'daysTarget', 'officer', 'date'],
  documentHubColumns: ['name', 'type', 'status', 'revision', 'ocr', 'size'],
  workLedgerPageSize: 20,
  documentHubPageSize: 20,
  lastVisitedPath: '/',
};

export class PreferencesService {
  static get(): UserPreferences {
    try {
      const stored = localStorage.getItem(PREFS_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }

  static set(prefs: Partial<UserPreferences>) {
    const current = this.get();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    return updated;
  }

  static reset() {
    localStorage.removeItem(PREFS_KEY);
    return { ...DEFAULTS };
  }
}
