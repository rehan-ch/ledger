import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Auth & Settings
  isSetupComplete: () => ipcRenderer.invoke('auth:isSetupComplete'),
  setup: (username: string, password: string, backupPath: string) => ipcRenderer.invoke('auth:setup', username, password, backupPath),
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),

  // Licensing
  getLicenseStatus: () => ipcRenderer.invoke('license:getStatus'),
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  activateLicense: (key: string) => ipcRenderer.invoke('license:activate', key),

  // Users
  getUsers: () => ipcRenderer.invoke('users:getAll'),
  getUser: (id: number) => ipcRenderer.invoke('users:get', id),
  createUser: (user: any) => ipcRenderer.invoke('users:create', user),
  updateUser: (id: number, user: any) => ipcRenderer.invoke('users:update', id, user),
  deleteUser: (id: number) => ipcRenderer.invoke('users:delete', id),

  // Accounts
  getAccounts: () => ipcRenderer.invoke('accounts:getAll'),
  createAccount: (account: any) => ipcRenderer.invoke('accounts:create', account),
  updateAccount: (id: number, account: any) => ipcRenderer.invoke('accounts:update', id, account),
  deleteAccount: (id: number) => ipcRenderer.invoke('accounts:delete', id),

  // Transactions
  getNextVoucherId: () => ipcRenderer.invoke('transactions:nextVoucherId'),
  getTransactions: (filters?: any) => ipcRenderer.invoke('transactions:getAll', filters),
  createTransaction: (transaction: any) => ipcRenderer.invoke('transactions:create', transaction),
  deleteTransaction: (id: number) => ipcRenderer.invoke('transactions:delete', id),

  // Currencies
  getCurrencies: () => ipcRenderer.invoke('currencies:getAll'),
  createCurrency: (currency: any) => ipcRenderer.invoke('currencies:create', currency),
  updateExchangeRate: (code: string, rate: number) => ipcRenderer.invoke('currencies:updateRate', code, rate),

  // Reports
  getTrialBalance: (filters?: any) => ipcRenderer.invoke('reports:trialBalance', filters),
  getGeneralLedger: (filters?: any) => ipcRenderer.invoke('reports:generalLedger', filters),
  getDashboardStats: () => ipcRenderer.invoke('reports:dashboard'),
  seedDemoData: () => ipcRenderer.invoke('dev:seed'),
});
