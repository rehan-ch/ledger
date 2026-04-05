import { IpcMain } from 'electron';
import { Database } from '../database/database';

// Helper: run a write operation then sync to secondary
function withSync<T>(db: Database, fn: () => T): T {
  const result = fn();
  db.syncToSecondary();
  return result;
}

export function registerIpcHandlers(ipcMain: IpcMain, db: Database) {
  // Auth & Settings
  ipcMain.handle('auth:isSetupComplete', () => db.isSetupComplete());
  ipcMain.handle('auth:setup', (_, _username, _password, backupPath) => {
    try { db.setupBackup(backupPath); db.syncToSecondary(); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('settings:get', (_, key) => db.getSetting(key));
  ipcMain.handle('settings:set', (_, key, value) => withSync(db, () => db.setSetting(key, value)));

  // Users
  ipcMain.handle('users:getAll', () => db.getUsers());
  ipcMain.handle('users:get', (_, id) => db.getUser(id));
  ipcMain.handle('users:create', (_, user) => {
    try { const data = db.createUser(user); db.syncToSecondary(); return { success: true, data }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('users:update', (_, id, user) => {
    try { const data = db.updateUser(id, user); db.syncToSecondary(); return { success: true, data }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('users:delete', (_, id) => {
    try { db.deleteUser(id); db.syncToSecondary(); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Accounts
  ipcMain.handle('accounts:getAll', () => db.getAccounts());
  ipcMain.handle('accounts:create', (_, account) => {
    try { const data = withSync(db, () => db.createAccount(account)); return data; }
    catch (e: any) { throw new Error(e.message); }
  });
  ipcMain.handle('accounts:update', (_, id, account) => {
    try { const data = withSync(db, () => db.updateAccount(id, account)); return data; }
    catch (e: any) { throw new Error(e.message); }
  });
  ipcMain.handle('accounts:delete', (_, id) => {
    try { db.deleteAccount(id); db.syncToSecondary(); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Currencies
  ipcMain.handle('currencies:getAll', () => db.getCurrencies());
  ipcMain.handle('currencies:create', (_, currency) => withSync(db, () => db.createCurrency(currency)));
  ipcMain.handle('currencies:updateRate', (_, code, rate) => withSync(db, () => db.updateExchangeRate(code, rate)));

  // Voucher
  ipcMain.handle('transactions:nextVoucherId', () => db.getNextVoucherId());

  // Transactions
  ipcMain.handle('transactions:getAll', (_, filters) => db.getTransactions(filters));
  ipcMain.handle('transactions:create', (_, txn) => {
    try { const data = db.createTransaction(txn); db.syncToSecondary(); return { success: true, data }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });
  ipcMain.handle('transactions:delete', (_, id) => {
    try { db.deleteTransaction(id); db.syncToSecondary(); return { success: true }; }
    catch (e: any) { return { success: false, error: e.message }; }
  });

  // Reports
  ipcMain.handle('reports:trialBalance', (_, filters) => db.getTrialBalance(filters));
  ipcMain.handle('reports:generalLedger', (_, filters) => db.getGeneralLedger(filters));
}
