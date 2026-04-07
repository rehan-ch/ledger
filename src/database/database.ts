import BetterSqlite3 from 'better-sqlite3';
import type { Account, Currency, Transaction, TransactionEntry, TrialBalanceRow, LedgerEntry, User } from '../shared/types';

export class Database {
  private db: BetterSqlite3.Database;

  constructor(dbPath: string) {
    this.db = new BetterSqlite3(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS currencies (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL DEFAULT '',
        exchange_rate REAL NOT NULL DEFAULT 1.0,
        is_base INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('asset','liability','equity','revenue','expense')),
        user_id INTEGER REFERENCES users(id),
        parent_id INTEGER REFERENCES accounts(id),
        currency_code TEXT NOT NULL DEFAULT 'USD' REFERENCES currencies(code),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id),
        date TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        reference TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS transaction_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        debit REAL NOT NULL DEFAULT 0,
        credit REAL NOT NULL DEFAULT 0,
        currency_code TEXT NOT NULL DEFAULT 'USD' REFERENCES currencies(code),
        exchange_rate REAL NOT NULL DEFAULT 1.0,
        description TEXT NOT NULL DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_entries_transaction ON transaction_entries(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_entries_account ON transaction_entries(account_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_voucher ON transactions(voucher_id);
    `);

    // Seed default base currency if none exists
    const hasCurrency = this.db.prepare('SELECT COUNT(*) as count FROM currencies').get() as any;
    if (hasCurrency.count === 0) {
      this.db.prepare('INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES (?, ?, ?, ?, ?)').run('USD', 'US Dollar', '$', 1.0, 1);
      this.db.prepare('INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES (?, ?, ?, ?, ?)').run('EUR', 'Euro', '€', 0.92, 0);
      this.db.prepare('INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES (?, ?, ?, ?, ?)').run('GBP', 'British Pound', '£', 0.79, 0);
    }
  }

  // --- Users ---
  getUsers(): User[] {
    return this.db.prepare('SELECT * FROM users ORDER BY name').all() as User[];
  }

  getUser(id: number): User | undefined {
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  createUser(user: { name: string; email?: string; phone?: string; address?: string }): User {
    const stmt = this.db.prepare('INSERT INTO users (name, email, phone, address) VALUES (?, ?, ?, ?)');
    const result = stmt.run(user.name, user.email || '', user.phone || '', user.address || '');
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid) as User;
  }

  updateUser(id: number, user: Partial<User>): User {
    const ALLOWED_FIELDS = new Set(['name', 'email', 'phone', 'address', 'is_active']);
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(user)) {
      if (ALLOWED_FIELDS.has(key)) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_active' ? (value ? 1 : 0) : value);
      }
    }
    if (fields.length === 0) return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
    values.push(id);
    this.db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User;
  }

  deleteUser(id: number): void {
    const hasTxns = this.db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(id) as any;
    if (hasTxns.count > 0) {
      throw new Error('Cannot delete user with existing transactions');
    }
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  // --- Accounts ---
  getAccounts(): Account[] {
    return this.db.prepare(`
      SELECT a.*, u.name as user_name,
        CASE
          WHEN a.type IN ('asset','expense') THEN COALESCE(SUM(te.debit * te.exchange_rate), 0) - COALESCE(SUM(te.credit * te.exchange_rate), 0)
          ELSE COALESCE(SUM(te.credit * te.exchange_rate), 0) - COALESCE(SUM(te.debit * te.exchange_rate), 0)
        END as balance
      FROM accounts a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN transaction_entries te ON te.account_id = a.id
      GROUP BY a.id
      ORDER BY a.code
    `).all() as Account[];
  }

  createAccount(account: Omit<Account, 'id' | 'created_at' | 'user_name'>): Account {
    const stmt = this.db.prepare(
      'INSERT INTO accounts (code, name, type, user_id, parent_id, currency_code, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(account.code, account.name, account.type, account.user_id, account.parent_id, account.currency_code, account.is_active ? 1 : 0);
    return this.db.prepare('SELECT a.*, u.name as user_name FROM accounts a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ?').get(result.lastInsertRowid) as Account;
  }

  updateAccount(id: number, account: Partial<Account>): Account {
    const ALLOWED_FIELDS = new Set(['code', 'name', 'type', 'user_id', 'parent_id', 'currency_code', 'is_active']);
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(account)) {
      if (ALLOWED_FIELDS.has(key)) {
        fields.push(`${key} = ?`);
        values.push(key === 'is_active' ? (value ? 1 : 0) : value); 
      }
    }
    if (fields.length === 0) return this.db.prepare('SELECT a.*, u.name as user_name FROM accounts a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ?').get(id) as Account;
    values.push(id);
    this.db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.db.prepare('SELECT a.*, u.name as user_name FROM accounts a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ?').get(id) as Account;
  }

  deleteAccount(id: number): void {
    const hasEntries = this.db.prepare('SELECT COUNT(*) as count FROM transaction_entries WHERE account_id = ?').get(id) as any;
    if (hasEntries.count > 0) {
      throw new Error('Cannot delete account with existing transactions');
    }
    this.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  }

  // --- Currencies ---
  getCurrencies(): Currency[] {
    return this.db.prepare('SELECT * FROM currencies ORDER BY is_base DESC, code').all() as Currency[];
  }

  createCurrency(currency: Currency): Currency {
    this.db.prepare('INSERT INTO currencies (code, name, symbol, exchange_rate, is_base) VALUES (?, ?, ?, ?, ?)').run(
      currency.code, currency.name, currency.symbol, currency.exchange_rate, currency.is_base ? 1 : 0
    );
    return this.db.prepare('SELECT * FROM currencies WHERE code = ?').get(currency.code) as Currency;
  }

  updateExchangeRate(code: string, rate: number): void {
    this.db.prepare('UPDATE currencies SET exchange_rate = ? WHERE code = ?').run(rate, code);
  }

  // --- Voucher ID ---
  getNextVoucherId(): number {
    const row = this.db.prepare('SELECT COALESCE(MAX(voucher_id), 0) + 1 as next_id FROM transactions').get() as any;
    return row.next_id;
  }

  // --- Transactions ---
  getTransactions(filters?: { from?: string; to?: string; accountId?: number; userId?: number }): Transaction[] {
    let query = `SELECT t.*, u.name as user_name FROM transactions t LEFT JOIN users u ON u.id = t.user_id`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.accountId) {
      query += ` INNER JOIN transaction_entries te ON te.transaction_id = t.id`;
      conditions.push('te.account_id = ?');
      params.push(filters.accountId);
    }

    if (filters?.userId) { conditions.push('t.user_id = ?'); params.push(filters.userId); }
    if (filters?.from) { conditions.push('t.date >= ?'); params.push(filters.from); }
    if (filters?.to) { conditions.push('t.date <= ?'); params.push(filters.to); }

    if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    query += ` GROUP BY t.id ORDER BY t.date DESC, t.voucher_id DESC`;

    const transactions = this.db.prepare(query).all(...params) as Transaction[];

    const entriesStmt = this.db.prepare('SELECT * FROM transaction_entries WHERE transaction_id = ?');
    for (const txn of transactions) {
      txn.entries = entriesStmt.all(txn.id) as TransactionEntry[];
    }
    return transactions;
  }

  createTransaction(txn: { user_id: number | null; date: string; description: string; reference: string; entries: TransactionEntry[] }): Transaction {
    // Validate user exists if provided
    if (txn.user_id) {
      const user = this.getUser(txn.user_id);
      if (!user) throw new Error(`User with ID ${txn.user_id} not found`);
    }

    // Validate: debits must equal credits (in base currency)
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of txn.entries) {
      totalDebit += entry.debit * entry.exchange_rate;
      totalCredit += entry.credit * entry.exchange_rate;
    }
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      throw new Error(`Transaction not balanced: debits (${totalDebit.toFixed(2)}) != credits (${totalCredit.toFixed(2)})`);
    }

    const insertTxn = this.db.prepare('INSERT INTO transactions (voucher_id, user_id, date, description, reference) VALUES (?, ?, ?, ?, ?)');
    const insertEntry = this.db.prepare(
      'INSERT INTO transaction_entries (transaction_id, account_id, debit, credit, currency_code, exchange_rate, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    const result = this.db.transaction(() => {
      const voucherId = this.getNextVoucherId();
      const txnResult = insertTxn.run(voucherId, txn.user_id, txn.date, txn.description, txn.reference);
      const txnId = txnResult.lastInsertRowid as number;
      for (const entry of txn.entries) {
        insertEntry.run(txnId, entry.account_id, entry.debit, entry.credit, entry.currency_code, entry.exchange_rate, entry.description || '');
      }
      return txnId;
    })();

    const saved = this.db.prepare('SELECT t.*, u.name as user_name FROM transactions t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?').get(result) as Transaction;
    saved.entries = this.db.prepare('SELECT * FROM transaction_entries WHERE transaction_id = ?').all(result) as TransactionEntry[];
    return saved;
  }

  deleteTransaction(id: number): void {
    this.db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  }

  // --- Reports ---
  getTrialBalance(filters?: { date?: string; userId?: number }): TrialBalanceRow[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.date) { conditions.push('t.date <= ?'); params.push(filters.date); }
    if (filters?.userId) { conditions.push('t.user_id = ?'); params.push(filters.userId); }

    const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    return this.db.prepare(`
      SELECT
        a.id as account_id,
        a.code as account_code,
        a.name as account_name,
        a.type as account_type,
        COALESCE(SUM(te.debit * te.exchange_rate), 0) as debit_total,
        COALESCE(SUM(te.credit * te.exchange_rate), 0) as credit_total,
        COALESCE(SUM(te.debit * te.exchange_rate), 0) - COALESCE(SUM(te.credit * te.exchange_rate), 0) as balance
      FROM accounts a
      LEFT JOIN transaction_entries te ON te.account_id = a.id
      LEFT JOIN transactions t ON t.id = te.transaction_id ${whereClause}
      WHERE a.is_active = 1
      GROUP BY a.id
      ORDER BY a.code
    `).all(...params) as TrialBalanceRow[];
  }

  getGeneralLedger(filters?: { accountId?: number; fromDate?: string; toDate?: string }): Record<number, { account: Account; entries: LedgerEntry[]; openingBalance: number; closingBalance: number }> {
    const accounts = filters?.accountId
      ? [this.db.prepare('SELECT a.*, u.name as user_name FROM accounts a LEFT JOIN users u ON u.id = a.user_id WHERE a.id = ?').get(filters.accountId) as Account]
      : this.getAccounts();

    const result: Record<number, { account: Account; entries: LedgerEntry[]; openingBalance: number; closingBalance: number }> = {};

    for (const account of accounts) {
      // Calculate opening balance (all entries BEFORE fromDate)
      let openingBalance = 0;
      if (filters?.fromDate) {
        const ob = this.db.prepare(`
          SELECT
            COALESCE(SUM(te.debit * te.exchange_rate), 0) as total_debit,
            COALESCE(SUM(te.credit * te.exchange_rate), 0) as total_credit
          FROM transaction_entries te
          JOIN transactions t ON t.id = te.transaction_id
          WHERE te.account_id = ? AND t.date < ?
        `).get(account.id, filters.fromDate) as any;
        if (account.type === 'asset' || account.type === 'expense') {
          openingBalance = (ob?.total_debit || 0) - (ob?.total_credit || 0);
        } else {
          openingBalance = (ob?.total_credit || 0) - (ob?.total_debit || 0);
        }
      }

      // Build date conditions
      const conditions: string[] = ['te.account_id = ?'];
      const params: any[] = [account.id];
      if (filters?.fromDate) { conditions.push('t.date >= ?'); params.push(filters.fromDate); }
      if (filters?.toDate) { conditions.push('t.date <= ?'); params.push(filters.toDate); }

      const entries = this.db.prepare(`
        SELECT
          t.id as transaction_id,
          t.voucher_id,
          t.date,
          t.description,
          t.reference,
          COALESCE(u.name, '') as user_name,
          te.debit,
          te.credit
        FROM transaction_entries te
        JOIN transactions t ON t.id = te.transaction_id
        LEFT JOIN users u ON u.id = t.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY t.date, t.voucher_id
      `).all(...params) as LedgerEntry[];

      let running = openingBalance;
      for (const entry of entries) {
        if (account.type === 'asset' || account.type === 'expense') {
          running += entry.debit - entry.credit;
        } else {
          running += entry.credit - entry.debit;
        }
        entry.running_balance = running;
      }

      const closingBalance = running;
      result[account.id] = { account, entries, openingBalance, closingBalance };
    }
    return result;
  }

  // --- Balance Sheet ---
  getBalanceSheet(asOfDate?: string) {
    const dateFilter = asOfDate ? 'AND t.date <= ?' : '';
    const params = asOfDate ? [asOfDate] : [];

    const rows = this.db.prepare(`
      SELECT
        a.id, a.code as account_code, a.name as account_name, a.type as account_type, a.parent_id,
        CASE
          WHEN a.type IN ('asset','expense') THEN COALESCE(SUM(te.debit * te.exchange_rate), 0) - COALESCE(SUM(te.credit * te.exchange_rate), 0)
          ELSE COALESCE(SUM(te.credit * te.exchange_rate), 0) - COALESCE(SUM(te.debit * te.exchange_rate), 0)
        END as balance
      FROM accounts a
      LEFT JOIN transaction_entries te ON te.account_id = a.id
      LEFT JOIN transactions t ON t.id = te.transaction_id ${dateFilter}
      WHERE a.is_active = 1 AND a.type IN ('asset', 'liability', 'equity')
      GROUP BY a.id
      ORDER BY a.type, a.code
    `).all(...params) as any[];

    const assets = rows.filter(r => r.account_type === 'asset');
    const liabilities = rows.filter(r => r.account_type === 'liability');
    const equity = rows.filter(r => r.account_type === 'equity');

    const totalAssets = assets.reduce((s: number, r: any) => s + r.balance, 0);
    const totalLiabilities = liabilities.reduce((s: number, r: any) => s + r.balance, 0);
    const totalEquity = equity.reduce((s: number, r: any) => s + r.balance, 0);

    // Retained earnings = revenue - expenses (not in equity accounts)
    const incomeRows = this.db.prepare(`
      SELECT a.type,
        CASE
          WHEN a.type = 'revenue' THEN COALESCE(SUM(te.credit * te.exchange_rate), 0) - COALESCE(SUM(te.debit * te.exchange_rate), 0)
          WHEN a.type = 'expense' THEN COALESCE(SUM(te.debit * te.exchange_rate), 0) - COALESCE(SUM(te.credit * te.exchange_rate), 0)
        END as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON te.account_id = a.id
      LEFT JOIN transactions t ON t.id = te.transaction_id ${dateFilter}
      WHERE a.type IN ('revenue', 'expense') AND a.is_active = 1
      GROUP BY a.type
    `).all(...params) as any[];

    const revenue = incomeRows.find((r: any) => r.type === 'revenue')?.amount || 0;
    const expenses = incomeRows.find((r: any) => r.type === 'expense')?.amount || 0;
    const retainedEarnings = revenue - expenses;

    return {
      assets, liabilities, equity,
      totalAssets,
      totalLiabilities,
      totalEquity: totalEquity + retainedEarnings,
      retainedEarnings,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity + retainedEarnings)) < 0.01,
    };
  }

  // --- Income Statement ---
  getIncomeStatement(filters?: { fromDate?: string; toDate?: string }): {
    revenue: { account_code: string; account_name: string; amount: number }[];
    expenses: { account_code: string; account_name: string; amount: number }[];
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    grossProfit: number;
  } {
    const conditions: string[] = [];
    const params: any[] = [];
    if (filters?.fromDate) { conditions.push('t.date >= ?'); params.push(filters.fromDate); }
    if (filters?.toDate) { conditions.push('t.date <= ?'); params.push(filters.toDate); }
    const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

    const rows = this.db.prepare(`
      SELECT
        a.code as account_code,
        a.name as account_name,
        a.type as account_type,
        CASE
          WHEN a.type = 'revenue' THEN COALESCE(SUM(te.credit * te.exchange_rate), 0) - COALESCE(SUM(te.debit * te.exchange_rate), 0)
          WHEN a.type = 'expense' THEN COALESCE(SUM(te.debit * te.exchange_rate), 0) - COALESCE(SUM(te.credit * te.exchange_rate), 0)
        END as amount
      FROM accounts a
      LEFT JOIN transaction_entries te ON te.account_id = a.id
      LEFT JOIN transactions t ON t.id = te.transaction_id ${whereClause}
      WHERE a.type IN ('revenue', 'expense') AND a.is_active = 1
      GROUP BY a.id
      HAVING amount != 0
      ORDER BY a.type DESC, a.code
    `).all(...params) as any[];

    const revenue = rows.filter(r => r.account_type === 'revenue').map(r => ({ account_code: r.account_code, account_name: r.account_name, amount: r.amount }));
    const expenses = rows.filter(r => r.account_type === 'expense').map(r => ({ account_code: r.account_code, account_name: r.account_name, amount: r.amount }));

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

    // Gross profit = sales revenue - cost of goods (for now same as total revenue since no COGS account)
    const grossProfit = totalRevenue;
    const netIncome = totalRevenue - totalExpenses;

    return { revenue, expenses, totalRevenue, totalExpenses, netIncome, grossProfit };
  }

  // --- Dashboard ---
  getDashboardStats() {
    const totalAccounts = (this.db.prepare('SELECT COUNT(*) as count FROM accounts WHERE is_active = 1').get() as any).count;
    const totalTransactions = (this.db.prepare('SELECT COUNT(*) as count FROM transactions').get() as any).count;
    const totalUsers = (this.db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;

    // Total assets, liabilities, equity, revenue, expense
    const balancesByType = this.db.prepare(`
      SELECT a.type,
        COALESCE(SUM(te.debit * te.exchange_rate), 0) as total_debit,
        COALESCE(SUM(te.credit * te.exchange_rate), 0) as total_credit
      FROM accounts a
      LEFT JOIN transaction_entries te ON te.account_id = a.id
      WHERE a.is_active = 1
      GROUP BY a.type
    `).all() as any[];

    const summary: Record<string, number> = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
    for (const row of balancesByType) {
      if (row.type === 'asset' || row.type === 'expense') {
        summary[row.type] = row.total_debit - row.total_credit;
      } else {
        summary[row.type] = row.total_credit - row.total_debit;
      }
    }

    // Monthly revenue & expense
    const monthlyData = this.db.prepare(`
      SELECT
        strftime('%Y-%m', t.date) as month,
        a.type,
        CASE
          WHEN a.type = 'revenue' THEN COALESCE(SUM(te.credit * te.exchange_rate), 0) - COALESCE(SUM(te.debit * te.exchange_rate), 0)
          WHEN a.type = 'expense' THEN COALESCE(SUM(te.debit * te.exchange_rate), 0) - COALESCE(SUM(te.credit * te.exchange_rate), 0)
        END as amount
      FROM transactions t
      JOIN transaction_entries te ON te.transaction_id = t.id
      JOIN accounts a ON a.id = te.account_id
      WHERE a.type IN ('revenue', 'expense')
      GROUP BY month, a.type
      ORDER BY month
    `).all() as any[];

    // Pivot into { month, revenue, expense } — fill all 12 months of the year
    const monthMap: Record<string, { month: string; revenue: number; expense: number }> = {};

    // Find the year from data, or use current year
    const dataYears = monthlyData.map((r: any) => r.month.substring(0, 4));
    const year = dataYears.length > 0 ? dataYears[0] : new Date().getFullYear().toString();

    // Pre-fill all 12 months
    for (let m = 1; m <= 12; m++) {
      const key = `${year}-${m.toString().padStart(2, '0')}`;
      monthMap[key] = { month: key, revenue: 0, expense: 0 };
    }

    for (const row of monthlyData) {
      if (!monthMap[row.month]) monthMap[row.month] = { month: row.month, revenue: 0, expense: 0 };
      monthMap[row.month][row.type as 'revenue' | 'expense'] = Math.abs(row.amount);
    }
    const monthlyChart = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

    // Top 5 accounts by transaction volume
    const topAccounts = this.db.prepare(`
      SELECT a.code, a.name, a.type, COUNT(te.id) as txn_count,
        COALESCE(SUM(te.debit * te.exchange_rate), 0) + COALESCE(SUM(te.credit * te.exchange_rate), 0) as volume
      FROM accounts a
      JOIN transaction_entries te ON te.account_id = a.id
      GROUP BY a.id
      ORDER BY txn_count DESC
      LIMIT 5
    `).all() as any[];

    // Recent 5 transactions
    const recentTransactions = this.db.prepare(`
      SELECT t.voucher_id, t.date, t.description, u.name as user_name,
        COALESCE(SUM(te.debit), 0) as total_debit
      FROM transactions t
      LEFT JOIN users u ON u.id = t.user_id
      JOIN transaction_entries te ON te.transaction_id = t.id
      GROUP BY t.id
      ORDER BY t.date DESC, t.voucher_id DESC
      LIMIT 5
    `).all() as any[];

    // Account type distribution (count per type)
    const accountsByType = this.db.prepare(`
      SELECT type, COUNT(*) as count FROM accounts WHERE is_active = 1 GROUP BY type
    `).all() as any[];

    return {
      totalAccounts,
      totalTransactions,
      totalUsers,
      summary,
      monthlyChart,
      topAccounts,
      recentTransactions,
      accountsByType,
    };
  }

  // --- App Settings ---
  isSetupComplete(): boolean {
    const row = this.db.prepare("SELECT value FROM app_settings WHERE key = 'backup_path'").get() as any;
    return !!row?.value;
  }

  setupBackup(backupPath: string): void {
    const upsert = this.db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    upsert.run('backup_path', backupPath);
  }

  getBackupPath(): string {
    const row = this.db.prepare("SELECT value FROM app_settings WHERE key = 'backup_path'").get() as any;
    return row?.value || '';
  }

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
    return row?.value || null;
  }

  setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  }

  getDbPath(): string {
    return this.db.name;
  }

  // --- Real-time Secondary Copy ---
  syncToSecondary(): void {
    try {
      const backupDir = this.getBackupPath();
      if (!backupDir) return;

      const fs = require('fs');
      const path = require('path');

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const secondaryPath = path.join(backupDir, 'ledger.db');
      this.db.backup(secondaryPath).then(() => {
        // backup complete
      }).catch(() => {
        // silent fail — secondary is best-effort
      });
    } catch {
      // silent fail
    }
  }

  close() {
    // Final sync before closing
    try {
      const backupDir = this.getBackupPath();
      if (backupDir) {
        const fs = require('fs');
        const path = require('path');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        const secondaryPath = path.join(backupDir, 'ledger.db');
        // Synchronous copy on close to ensure data is saved
        fs.copyFileSync(this.db.name, secondaryPath);
      }
    } catch {
      // best-effort
    }
    this.db.close();
  }
}
