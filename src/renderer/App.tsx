import React, { useState, useEffect, useCallback } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { StatusBar } from './components/StatusBar';
import { Toast, ToastMessage } from './components/Toast';
import { SetupWizard } from './views/SetupWizard';
import { ActivationScreen } from './views/ActivationScreen';
import { Dashboard } from './views/Dashboard';
import { ChartOfAccounts } from './views/ChartOfAccounts';
import { JournalEntry } from './views/JournalEntry';
import { GeneralLedger } from './views/GeneralLedger';
import { TrialBalance } from './views/TrialBalance';
import { CurrencyManager } from './views/CurrencyManager';

declare global {
  interface Window {
    api: {
      isSetupComplete: () => Promise<boolean>;
      setup: (username: string, password: string, backupPath: string) => Promise<any>;
      login: (username: string, password: string) => Promise<boolean>;
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<void>;
      selectFolder: () => Promise<string | null>;
      getLicenseStatus: () => Promise<any>;
      getMachineId: () => Promise<string>;
      activateLicense: (key: string) => Promise<any>;
      getUsers: () => Promise<any[]>;
      getUser: (id: number) => Promise<any>;
      createUser: (u: any) => Promise<any>;
      updateUser: (id: number, u: any) => Promise<any>;
      deleteUser: (id: number) => Promise<any>;
      getAccounts: () => Promise<any[]>;
      createAccount: (a: any) => Promise<any>;
      updateAccount: (id: number, a: any) => Promise<any>;
      deleteAccount: (id: number) => Promise<any>;
      getNextVoucherId: () => Promise<number>;
      getTransactions: (f?: any) => Promise<any[]>;
      createTransaction: (t: any) => Promise<any>;
      deleteTransaction: (id: number) => Promise<any>;
      getCurrencies: () => Promise<any[]>;
      createCurrency: (c: any) => Promise<any>;
      updateExchangeRate: (code: string, rate: number) => Promise<void>;
      getTrialBalance: (filters?: any) => Promise<any[]>;
      getGeneralLedger: (filters?: any) => Promise<any>;
      getDashboardStats: () => Promise<any>;
      seedDemoData: () => Promise<any>;
    };
  }
}

type AppState = 'loading' | 'setup' | 'activation' | 'app';
type View = 'dashboard' | 'accounts' | 'journal' | 'ledger' | 'trial-balance' | 'currencies';

const VIEWS: { id: View; label: string; shortcut: string }[] = [
  { id: 'dashboard', label: 'Dashboard', shortcut: '1' },
  { id: 'accounts', label: 'Chart of Accounts', shortcut: '2' },
  { id: 'journal', label: 'Journal Entry', shortcut: '3' },
  { id: 'ledger', label: 'General Ledger', shortcut: '4' },
  { id: 'trial-balance', label: 'Trial Balance', shortcut: '5' },
  { id: 'currencies', label: 'Currencies', shortcut: '6' },
];

export function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [showPalette, setShowPalette] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    (async () => {
      const license = await window.api.getLicenseStatus();
      setLicenseInfo(license);

      if (license.status === 'trial_expired' || license.status === 'license_expired') {
        setAppState('activation');
        return;
      }

      const isSetup = await window.api.isSetupComplete();
      setAppState(isSetup ? 'app' : 'setup');
    })();
  }, []);

  const handleActivated = async () => {
    const license = await window.api.getLicenseStatus();
    setLicenseInfo(license);
    const isSetup = await window.api.isSetupComplete();
    setAppState(isSetup ? 'app' : 'setup');
  };

  useEffect(() => {
    if (appState !== 'app') return;

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setShowPalette(true);
        return;
      }

      if (e.key === 'Escape') {
        setShowPalette(false);
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const view = VIEWS[parseInt(e.key) - 1];
        if (view) setActiveView(view.id);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [appState]);

  if (appState === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (appState === 'activation' && licenseInfo) {
    return (
      <ActivationScreen
        machineId={licenseInfo.machineId}
        status={licenseInfo.status}
        expiryDate={licenseInfo.expiryDate}
        onActivated={handleActivated}
      />
    );
  }

  if (appState === 'setup') {
    return <SetupWizard onComplete={() => setAppState('app')} />;
  }

  const renderView = () => {
    const baseProps = { showToast, refresh, key: refreshKey };
    switch (activeView) {
      case 'dashboard': return <Dashboard {...baseProps} />;
      case 'accounts': return <ChartOfAccounts {...baseProps} />;
      case 'journal': return <JournalEntry {...baseProps} />;
      case 'ledger': return <GeneralLedger {...baseProps} />;
      case 'trial-balance': return <TrialBalance {...baseProps} />;
      case 'currencies': return <CurrencyManager {...baseProps} />;
    }
  };

  const commands = [
    ...VIEWS.map(v => ({ label: `Go to ${v.label}`, shortcut: `Alt+${v.shortcut}`, action: () => setActiveView(v.id) })),
    { label: 'Refresh', shortcut: 'Ctrl+R', action: refresh },
  ];

  const showExpiryWarning = licenseInfo && licenseInfo.daysRemaining <= 7 && licenseInfo.daysRemaining > 0;

  return (
    <div className="app-layout">
      {showExpiryWarning && (
        <div style={{ background: '#3a2a1a', borderBottom: '1px solid var(--warning)', padding: '6px 16px', fontSize: '13px', color: 'var(--warning)', textAlign: 'center' }}>
          Your {licenseInfo.status === 'licensed' ? 'license' : 'trial'} expires in <strong>{licenseInfo.daysRemaining} day{licenseInfo.daysRemaining !== 1 ? 's' : ''}</strong> (on {licenseInfo.expiryDate}). Please contact your provider for a license key.
        </div>
      )}
      <header className="app-header">
        <h1>Ledger</h1>
        <span className="shortcut-hint">Ctrl+P Command Palette | Alt+1-6 Navigate</span>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          {VIEWS.map(view => (
            <button
              key={view.id}
              className={`sidebar-item ${activeView === view.id ? 'active' : ''}`}
              onClick={() => setActiveView(view.id)}
              tabIndex={0}
            >
              {view.label}
              <span className="shortcut">Alt+{view.shortcut}</span>
            </button>
          ))}
        </nav>

        <main className="main-content">
          {renderView()}
        </main>
      </div>

      <StatusBar view={activeView} />

      {showPalette && (
        <CommandPalette
          commands={commands}
          onClose={() => setShowPalette(false)}
        />
      )}

      {toast && <Toast message={toast} />}
    </div>
  );
}
