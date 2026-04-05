export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  user_id: number | null;
  user_name?: string;
  parent_id: number | null;
  currency_code: string;
  is_active: boolean;
  created_at: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number; // rate to base currency
  is_base: boolean;
}

export interface TransactionEntry {
  id?: number;
  transaction_id?: number;
  account_id: number;
  debit: number;
  credit: number;
  currency_code: string;
  exchange_rate: number;
  description?: string;
}

export interface Transaction {
  id: number;
  voucher_id: number;
  user_id: number;
  user_name?: string;
  date: string;
  description: string;
  reference: string;
  entries: TransactionEntry[];
  created_at: string;
}

export interface TrialBalanceRow {
  account_id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  debit_total: number;
  credit_total: number;
  balance: number;
}

export interface LedgerEntry {
  transaction_id: number;
  voucher_id: number;
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  running_balance: number;
}
