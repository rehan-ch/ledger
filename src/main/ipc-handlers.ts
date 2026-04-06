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
  ipcMain.handle('reports:dashboard', () => db.getDashboardStats());

  // Seed demo data (dev only)
  ipcMain.handle('dev:seed', () => {
    if (!process.env.IS_DEV) return { success: false, error: 'Not available in production' };
    try {
      // Check if data already exists
      const existing = db.getUsers();
      if (existing.length > 0) return { success: false, error: 'Database already has data. Clear it first.' };

      const users = [
        { name: 'Ahmed Khan', email: 'ahmed@example.com', phone: '+92 300 1234567', address: 'Karachi, Pakistan' },
        { name: 'Sara Ali', email: 'sara@example.com', phone: '+92 321 9876543', address: 'Lahore, Pakistan' },
        { name: 'John Smith', email: 'john@example.com', phone: '+1 555 1234', address: 'New York, USA' },
        { name: 'Maria Garcia', email: 'maria@example.com', phone: '+34 612 345678', address: 'Madrid, Spain' },
        { name: 'Fatima Zahra', email: 'fatima@example.com', phone: '+92 333 4567890', address: 'Islamabad, Pakistan' },
      ].map(u => db.createUser(u));

      db.createCurrency({ code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', exchange_rate: 278.50, is_base: false });
      db.createCurrency({ code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', exchange_rate: 3.67, is_base: false });

      const a: Record<string, any> = {};
      a.cash = db.createAccount({ code: '1000', name: 'Cash', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.bank = db.createAccount({ code: '1010', name: 'Bank Account', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.ar = db.createAccount({ code: '1100', name: 'Accounts Receivable', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.inventory = db.createAccount({ code: '1200', name: 'Inventory', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.equipment = db.createAccount({ code: '1500', name: 'Office Equipment', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.ap = db.createAccount({ code: '2000', name: 'Accounts Payable', type: 'liability', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.loan = db.createAccount({ code: '2100', name: 'Bank Loan', type: 'liability', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.taxPayable = db.createAccount({ code: '2200', name: 'Tax Payable', type: 'liability', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.capital = db.createAccount({ code: '3000', name: 'Owner Capital', type: 'equity', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.retained = db.createAccount({ code: '3100', name: 'Retained Earnings', type: 'equity', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.sales = db.createAccount({ code: '4000', name: 'Sales Revenue', type: 'revenue', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.serviceRev = db.createAccount({ code: '4100', name: 'Service Revenue', type: 'revenue', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.interest = db.createAccount({ code: '4200', name: 'Interest Income', type: 'revenue', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.rent = db.createAccount({ code: '5000', name: 'Rent Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.salaries = db.createAccount({ code: '5100', name: 'Salaries Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.utilities = db.createAccount({ code: '5200', name: 'Utilities Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.supplies = db.createAccount({ code: '5300', name: 'Office Supplies', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.transport = db.createAccount({ code: '5400', name: 'Transport Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.marketing = db.createAccount({ code: '5500', name: 'Marketing Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
      a.arAhmed = db.createAccount({ code: '1101', name: 'AR - Ahmed Khan', type: 'asset', user_id: users[0].id, parent_id: a.ar.id, currency_code: 'USD', is_active: true });
      a.arSara = db.createAccount({ code: '1102', name: 'AR - Sara Ali', type: 'asset', user_id: users[1].id, parent_id: a.ar.id, currency_code: 'USD', is_active: true });
      a.arJohn = db.createAccount({ code: '1103', name: 'AR - John Smith', type: 'asset', user_id: users[2].id, parent_id: a.ar.id, currency_code: 'USD', is_active: true });
      a.apMaria = db.createAccount({ code: '2001', name: 'AP - Maria Garcia', type: 'liability', user_id: users[3].id, parent_id: a.ap.id, currency_code: 'USD', is_active: true });
      a.apFatima = db.createAccount({ code: '2002', name: 'AP - Fatima Zahra', type: 'liability', user_id: users[4].id, parent_id: a.ap.id, currency_code: 'USD', is_active: true });

      const e = (aid: number, d: number, c: number) => ({ account_id: aid, debit: d, credit: c, currency_code: 'USD', exchange_rate: 1 });
      const txns = [
        { user_id: users[0].id, date: '2025-01-05', description: 'Owner capital investment', reference: '', entries: [e(a.bank.id, 50000, 0), e(a.capital.id, 0, 50000)] },
        { user_id: null, date: '2025-01-10', description: 'Office rent - January', reference: '', entries: [e(a.rent.id, 3000, 0), e(a.bank.id, 0, 3000)] },
        { user_id: null, date: '2025-01-15', description: 'Bought office laptops and desks', reference: '', entries: [e(a.equipment.id, 8500, 0), e(a.bank.id, 0, 8500)] },
        { user_id: users[0].id, date: '2025-01-20', description: 'Sold goods to Ahmed Khan', reference: '', entries: [e(a.arAhmed.id, 12000, 0), e(a.sales.id, 0, 12000)] },
        { user_id: users[0].id, date: '2025-01-28', description: 'Payment received from Ahmed Khan', reference: '', entries: [e(a.bank.id, 7000, 0), e(a.arAhmed.id, 0, 7000)] },
        { user_id: users[2].id, date: '2025-02-01', description: 'Consulting service to John Smith', reference: '', entries: [e(a.arJohn.id, 5500, 0), e(a.serviceRev.id, 0, 5500)] },
        { user_id: null, date: '2025-02-05', description: 'Staff salaries - February', reference: '', entries: [e(a.salaries.id, 15000, 0), e(a.bank.id, 0, 15000)] },
        { user_id: users[3].id, date: '2025-02-10', description: 'Inventory purchase from Maria Garcia', reference: '', entries: [e(a.inventory.id, 9000, 0), e(a.apMaria.id, 0, 9000)] },
        { user_id: null, date: '2025-02-10', description: 'Office rent - February', reference: '', entries: [e(a.rent.id, 3000, 0), e(a.bank.id, 0, 3000)] },
        { user_id: users[3].id, date: '2025-02-20', description: 'Payment to Maria Garcia', reference: '', entries: [e(a.apMaria.id, 5000, 0), e(a.bank.id, 0, 5000)] },
        { user_id: users[1].id, date: '2025-02-25', description: 'Sold goods to Sara Ali (PKR)', reference: '', entries: [
          { account_id: a.arSara.id, debit: 2500000, credit: 0, currency_code: 'PKR', exchange_rate: 278.50 },
          { account_id: a.sales.id, debit: 0, credit: 2500000, currency_code: 'PKR', exchange_rate: 278.50 },
        ]},
        { user_id: null, date: '2025-03-01', description: 'Electricity and internet - March', reference: '', entries: [e(a.utilities.id, 850, 0), e(a.bank.id, 0, 850)] },
        { user_id: null, date: '2025-03-05', description: 'Printer paper, toner, pens', reference: '', entries: [e(a.supplies.id, 420, 0), e(a.cash.id, 0, 420)] },
        { user_id: users[2].id, date: '2025-03-10', description: 'Full payment from John Smith', reference: '', entries: [e(a.bank.id, 5500, 0), e(a.arJohn.id, 0, 5500)] },
        { user_id: null, date: '2025-03-15', description: 'Business expansion loan from bank', reference: '', entries: [e(a.bank.id, 25000, 0), e(a.loan.id, 0, 25000)] },
        { user_id: null, date: '2025-03-20', description: 'Google Ads + social media campaign', reference: '', entries: [e(a.marketing.id, 2200, 0), e(a.bank.id, 0, 2200)] },
        { user_id: users[4].id, date: '2025-03-22', description: 'Web development by Fatima Zahra', reference: '', entries: [e(a.marketing.id, 3500, 0), e(a.apFatima.id, 0, 3500)] },
        { user_id: null, date: '2025-03-25', description: 'Delivery and shipping costs', reference: '', entries: [e(a.transport.id, 1100, 0), e(a.cash.id, 0, 1100)] },
        { user_id: null, date: '2025-03-30', description: 'Quarterly bank interest earned', reference: '', entries: [e(a.bank.id, 320, 0), e(a.interest.id, 0, 320)] },
        { user_id: null, date: '2025-03-31', description: 'Quarterly tax payment', reference: '', entries: [e(a.taxPayable.id, 4500, 0), e(a.bank.id, 0, 4500)] },
      ];

      for (const txn of txns) { db.createTransaction(txn); }
      db.syncToSecondary();

      return { success: true, users: users.length, accounts: Object.keys(a).length, transactions: txns.length };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
}
