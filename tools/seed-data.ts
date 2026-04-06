/**
 * Seed dummy data for testing.
 *
 * Usage:
 *   npx ts-node tools/seed-data.ts [path-to-ledger.db]
 *
 * If no path given, uses ~/.config/ledger/ledger.db (Linux default)
 */

import path from 'path';
import os from 'os';

// Resolve DB path
let dbPath = process.argv[2];
if (!dbPath) {
  const platform = os.platform();
  if (platform === 'linux') dbPath = path.join(os.homedir(), '.config', 'ledger', 'ledger.db');
  else if (platform === 'darwin') dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'ledger', 'ledger.db');
  else dbPath = path.join(process.env.APPDATA || os.homedir(), 'ledger', 'ledger.db');
}

console.log(`Seeding database: ${dbPath}\n`);

import { Database } from '../src/database/database';
const db = new Database(dbPath);

// --- Users ---
console.log('Creating users...');
const users = [
  { name: 'Ahmed Khan', email: 'ahmed@example.com', phone: '+92 300 1234567', address: 'Karachi, Pakistan' },
  { name: 'Sara Ali', email: 'sara@example.com', phone: '+92 321 9876543', address: 'Lahore, Pakistan' },
  { name: 'John Smith', email: 'john@example.com', phone: '+1 555 1234', address: 'New York, USA' },
  { name: 'Maria Garcia', email: 'maria@example.com', phone: '+34 612 345678', address: 'Madrid, Spain' },
  { name: 'Fatima Zahra', email: 'fatima@example.com', phone: '+92 333 4567890', address: 'Islamabad, Pakistan' },
].map(u => db.createUser(u));

console.log(`  Created ${users.length} users\n`);

// --- Currencies (USD, EUR, GBP already seeded) ---
console.log('Adding currencies...');
db.createCurrency({ code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs', exchange_rate: 278.50, is_base: false });
db.createCurrency({ code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', exchange_rate: 3.67, is_base: false });
console.log('  Added PKR, AED\n');

// --- Accounts ---
console.log('Creating chart of accounts...');
const accounts: Record<string, ReturnType<typeof db.createAccount>> = {};

// Assets
accounts.cash = db.createAccount({ code: '1000', name: 'Cash', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.bank = db.createAccount({ code: '1010', name: 'Bank Account', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.ar = db.createAccount({ code: '1100', name: 'Accounts Receivable', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.inventory = db.createAccount({ code: '1200', name: 'Inventory', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.equipment = db.createAccount({ code: '1500', name: 'Office Equipment', type: 'asset', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });

// Liabilities
accounts.ap = db.createAccount({ code: '2000', name: 'Accounts Payable', type: 'liability', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.loan = db.createAccount({ code: '2100', name: 'Bank Loan', type: 'liability', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.taxPayable = db.createAccount({ code: '2200', name: 'Tax Payable', type: 'liability', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });

// Equity
accounts.capital = db.createAccount({ code: '3000', name: 'Owner Capital', type: 'equity', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.retained = db.createAccount({ code: '3100', name: 'Retained Earnings', type: 'equity', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });

// Revenue
accounts.sales = db.createAccount({ code: '4000', name: 'Sales Revenue', type: 'revenue', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.serviceRev = db.createAccount({ code: '4100', name: 'Service Revenue', type: 'revenue', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.interest = db.createAccount({ code: '4200', name: 'Interest Income', type: 'revenue', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });

// Expenses
accounts.rent = db.createAccount({ code: '5000', name: 'Rent Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.salaries = db.createAccount({ code: '5100', name: 'Salaries Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.utilities = db.createAccount({ code: '5200', name: 'Utilities Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.supplies = db.createAccount({ code: '5300', name: 'Office Supplies', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.transport = db.createAccount({ code: '5400', name: 'Transport Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });
accounts.marketing = db.createAccount({ code: '5500', name: 'Marketing Expense', type: 'expense', user_id: null, parent_id: null, currency_code: 'USD', is_active: true });

// User-specific accounts (receivable/payable per user)
accounts.arAhmed = db.createAccount({ code: '1101', name: 'AR - Ahmed Khan', type: 'asset', user_id: users[0].id, parent_id: accounts.ar.id, currency_code: 'USD', is_active: true });
accounts.arSara = db.createAccount({ code: '1102', name: 'AR - Sara Ali', type: 'asset', user_id: users[1].id, parent_id: accounts.ar.id, currency_code: 'USD', is_active: true });
accounts.arJohn = db.createAccount({ code: '1103', name: 'AR - John Smith', type: 'asset', user_id: users[2].id, parent_id: accounts.ar.id, currency_code: 'USD', is_active: true });
accounts.apMaria = db.createAccount({ code: '2001', name: 'AP - Maria Garcia', type: 'liability', user_id: users[3].id, parent_id: accounts.ap.id, currency_code: 'USD', is_active: true });
accounts.apFatima = db.createAccount({ code: '2002', name: 'AP - Fatima Zahra', type: 'liability', user_id: users[4].id, parent_id: accounts.ap.id, currency_code: 'USD', is_active: true });

console.log(`  Created ${Object.keys(accounts).length} accounts\n`);

// --- Transactions ---
console.log('Creating transactions...');

const txns = [
  // 1. Owner invests capital
  {
    user_id: users[0].id, date: '2025-01-05', description: 'Owner capital investment',
    reference: '', entries: [
      { account_id: accounts.bank.id, debit: 50000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.capital.id, debit: 0, credit: 50000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 2. Paid rent
  {
    user_id: users[0].id, date: '2025-01-10', description: 'Office rent - January',
    reference: '', entries: [
      { account_id: accounts.rent.id, debit: 3000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 3000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 3. Purchased equipment
  {
    user_id: users[0].id, date: '2025-01-15', description: 'Bought office laptops and desks',
    reference: '', entries: [
      { account_id: accounts.equipment.id, debit: 8500, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 8500, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 4. Sale to Ahmed (on credit)
  {
    user_id: users[0].id, date: '2025-01-20', description: 'Sold goods to Ahmed Khan',
    reference: '', entries: [
      { account_id: accounts.arAhmed.id, debit: 12000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.sales.id, debit: 0, credit: 12000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 5. Ahmed pays partially
  {
    user_id: users[0].id, date: '2025-01-28', description: 'Payment received from Ahmed Khan',
    reference: '', entries: [
      { account_id: accounts.bank.id, debit: 7000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.arAhmed.id, debit: 0, credit: 7000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 6. Service revenue from John
  {
    user_id: users[2].id, date: '2025-02-01', description: 'Consulting service to John Smith',
    reference: '', entries: [
      { account_id: accounts.arJohn.id, debit: 5500, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.serviceRev.id, debit: 0, credit: 5500, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 7. Paid salaries
  {
    user_id: users[0].id, date: '2025-02-05', description: 'Staff salaries - February',
    reference: '', entries: [
      { account_id: accounts.salaries.id, debit: 15000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 15000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 8. Purchased inventory from Maria (on credit)
  {
    user_id: users[3].id, date: '2025-02-10', description: 'Inventory purchase from Maria Garcia',
    reference: '', entries: [
      { account_id: accounts.inventory.id, debit: 9000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.apMaria.id, debit: 0, credit: 9000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 9. Paid Maria partially
  {
    user_id: users[3].id, date: '2025-02-20', description: 'Payment to Maria Garcia',
    reference: '', entries: [
      { account_id: accounts.apMaria.id, debit: 5000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 5000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 10. Sale to Sara (multi-currency PKR)
  {
    user_id: users[1].id, date: '2025-02-25', description: 'Sold goods to Sara Ali (PKR)',
    reference: '', entries: [
      { account_id: accounts.arSara.id, debit: 2500000, credit: 0, currency_code: 'PKR', exchange_rate: 278.50 },
      { account_id: accounts.sales.id, debit: 0, credit: 2500000, currency_code: 'PKR', exchange_rate: 278.50 },
    ]
  },
  // 11. Utilities paid
  {
    user_id: users[0].id, date: '2025-03-01', description: 'Electricity and internet - March',
    reference: '', entries: [
      { account_id: accounts.utilities.id, debit: 850, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 850, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 12. Office supplies
  {
    user_id: users[0].id, date: '2025-03-05', description: 'Printer paper, toner, pens',
    reference: '', entries: [
      { account_id: accounts.supplies.id, debit: 420, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.cash.id, debit: 0, credit: 420, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 13. John pays full amount
  {
    user_id: users[2].id, date: '2025-03-10', description: 'Full payment from John Smith',
    reference: '', entries: [
      { account_id: accounts.bank.id, debit: 5500, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.arJohn.id, debit: 0, credit: 5500, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 14. Took bank loan
  {
    user_id: users[0].id, date: '2025-03-15', description: 'Business expansion loan from bank',
    reference: '', entries: [
      { account_id: accounts.bank.id, debit: 25000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.loan.id, debit: 0, credit: 25000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 15. Marketing expense
  {
    user_id: users[0].id, date: '2025-03-20', description: 'Google Ads + social media campaign',
    reference: '', entries: [
      { account_id: accounts.marketing.id, debit: 2200, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 2200, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 16. Service from Fatima (on credit)
  {
    user_id: users[4].id, date: '2025-03-22', description: 'Web development by Fatima Zahra',
    reference: '', entries: [
      { account_id: accounts.marketing.id, debit: 3500, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.apFatima.id, debit: 0, credit: 3500, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 17. Transport expense
  {
    user_id: users[0].id, date: '2025-03-25', description: 'Delivery and shipping costs',
    reference: '', entries: [
      { account_id: accounts.transport.id, debit: 1100, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.cash.id, debit: 0, credit: 1100, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 18. Interest income from bank
  {
    user_id: users[0].id, date: '2025-03-30', description: 'Quarterly bank interest earned',
    reference: '', entries: [
      { account_id: accounts.bank.id, debit: 320, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.interest.id, debit: 0, credit: 320, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 19. Tax payment
  {
    user_id: users[0].id, date: '2025-03-31', description: 'Quarterly tax payment',
    reference: '', entries: [
      { account_id: accounts.taxPayable.id, debit: 4500, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 4500, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
  // 20. Rent for February
  {
    user_id: users[0].id, date: '2025-02-10', description: 'Office rent - February',
    reference: '', entries: [
      { account_id: accounts.rent.id, debit: 3000, credit: 0, currency_code: 'USD', exchange_rate: 1 },
      { account_id: accounts.bank.id, debit: 0, credit: 3000, currency_code: 'USD', exchange_rate: 1 },
    ]
  },
];

for (const txn of txns) {
  db.createTransaction(txn);
}

console.log(`  Created ${txns.length} transactions\n`);

// Summary
console.log('=== Seed Complete ===');
console.log(`Users:        ${users.length}`);
console.log(`Accounts:     ${Object.keys(accounts).length}`);
console.log(`Transactions: ${txns.length}`);
console.log(`Currencies:   5 (USD, EUR, GBP, PKR, AED)`);
console.log('');
console.log('Trial Balance should show:');
console.log('  Total Debits  = Total Credits (balanced)');
console.log('  Ahmed owes    $5,000 (12k - 7k payment)');
console.log('  Maria owed    $4,000 (9k - 5k payment)');
console.log('  Fatima owed   $3,500');
console.log('  John paid     in full ($0 balance)');
console.log('');

db.close();
console.log('Done!');
