# Ledger - Double Entry Accounting

A desktop double-entry bookkeeping application built with Electron, React, and SQLite. Designed to be fully keyboard-driven with multi-currency support.

## Features

### Core Accounting
- **Double-entry bookkeeping** — every transaction enforces balanced debits and credits
- **Chart of Accounts** — asset, liability, equity, revenue, and expense account types
- **Journal Entries** — create transactions with multiple debit/credit lines
- **General Ledger** — per-account ledger with running balance
- **Trial Balance** — summary report with balanced totals
- **Auto-incremented Voucher ID** — each transaction gets a unique sequential voucher number, displayed in the form before saving

### Multi-Currency
- USD, EUR, GBP seeded by default
- Add unlimited currencies with custom exchange rates
- Per-account and per-entry currency selection
- Exchange rates applied automatically in balance calculations

### Users & Accounts
- Create users (customers, vendors, parties)
- Attach users to accounts — when selecting an account in a journal entry, the user auto-populates
- Searchable dropdowns for both users and accounts in the journal form

### Licensing
- **Silent 3-month trial** — app works fully with no trial indication for the first 3 months
- **Activation required after trial** — the app blocks and shows the activation screen with the Machine ID
- **1-year license keys** — generated offline by the developer using a CLI tool, tied to a specific machine
- **Offline validation** — no internet needed, license keys are verified using HMAC signatures
- **Machine-locked** — each license key is bound to a unique hardware fingerprint

### Security
- **First-time setup wizard** — configure admin username, password, and backup folder on first launch
- **Login screen** — username/password required on every app launch
- **Password hashing** — PBKDF2 with SHA-512 (100k iterations) + random salt, never stored in plain text

### Backup
- **Daily auto-backup** — database is copied to the configured backup folder as `ledger-backup-YYYY-MM-DD.db`
- One backup per day (does not overwrite existing daily backup)
- Backup runs on startup and every 6 hours while the app is open
- Backup folder is created automatically if it does not exist

### Excel Export
Every view can export its data to `.xlsx` with `Ctrl+E` or the Export button:

| View | File | Columns |
|------|------|---------|
| Users | `users.xlsx` | ID, Name, Email, Phone, Address, Status |
| Chart of Accounts | `chart-of-accounts.xlsx` | Code, Name, Type, User, Currency, Status |
| Journal Entries | `journal-entries.xlsx` | Voucher #, Date, User, Description, Account, Debit, Credit, Currency |
| General Ledger | `general-ledger.xlsx` | Account, Voucher #, Date, Description, Debit, Credit, Balance |
| Trial Balance | `trial-balance.xlsx` | Code, Account, Type, Debits, Credits, Balance |
| Currencies | `currencies.xlsx` | Code, Name, Symbol, Exchange Rate, Base |

### Keyboard-First Design
The entire application is operable without a mouse.

#### Global
| Key | Action |
|-----|--------|
| `Ctrl+P` | Open command palette |
| `Alt+1` to `Alt+6` | Switch between views |
| `Escape` | Close any dialog, form, or filter |

#### All Table Views
| Key | Action |
|-----|--------|
| `j` / `ArrowDown` | Move selection down |
| `k` / `ArrowUp` | Move selection up |
| `n` | Create new item |
| `e` / `Enter` | Edit selected item |
| `d` | Delete with y/n confirmation |
| `/` | Focus search or filter input |
| `Ctrl+E` | Export to Excel |

#### Journal Entry Form
| Key | Action |
|-----|--------|
| `Enter` | Expand/collapse transaction to show entry lines |
| `Ctrl+Enter` | Save transaction |
| `Ctrl+A` | Add new entry line |
| `Escape` | Close form |

#### Searchable Dropdowns
| Key | Action |
|-----|--------|
| Type | Filter options |
| `ArrowDown` / `ArrowUp` | Navigate list |
| `Enter` | Select highlighted option |
| `Escape` | Close dropdown |
| `Tab` | Close and move to next field |

#### Confirm Dialog
| Key | Action |
|-----|--------|
| `y` / `Enter` | Confirm |
| `n` / `Escape` | Cancel |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron |
| Frontend | React + TypeScript |
| Database | SQLite (better-sqlite3) |
| Bundler | Webpack |
| Styling | Custom CSS (Tokyo Night theme) |
| Export | SheetJS (xlsx) |
| Build | electron-builder |

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Install
```bash
git clone <repo-url>
cd ledger
npm install
```

### Run in Development
```bash
npm start
```

This builds with webpack and launches the Electron app. On first launch you will see the setup wizard to configure your admin credentials and backup folder.

### Build for Distribution
```bash
# All platforms (run on each OS respectively)
npm run dist

# Platform-specific
npm run dist:win      # Windows (.exe installer + portable)
npm run dist:linux    # Linux (.AppImage + .deb)
npm run dist:mac      # macOS (.dmg)
```

Output goes to the `release/` directory.

## CI/CD Pipeline

The project includes a GitHub Actions workflow at `.github/workflows/build.yml` that builds installers for all three platforms.

### How It Works

Three parallel jobs run on native runners:

| Job | Runner | Outputs |
|-----|--------|---------|
| `build-windows` | `windows-latest` | NSIS installer `.exe` + portable `.exe` |
| `build-linux` | `ubuntu-latest` | `.AppImage` + `.deb` |
| `build-mac` | `macos-latest` | `.dmg` (x64 + ARM) |

A fourth `release` job waits for all three to finish, then collects the artifacts and creates a GitHub Release.

### Triggers

| Trigger | When | What Happens |
|---------|------|-------------|
| **Tag push** | `git push origin v1.0.0` | Builds all platforms + creates GitHub Release with installers |
| **Manual** | Actions tab > Run workflow | Builds all platforms, uploads artifacts (no release) |

### Creating a Release

```bash
# Tag and push
git tag v1.0.0
git push origin v1.0.0
```

This automatically:
1. Builds Windows, Linux, and macOS installers in parallel
2. Creates a GitHub Release at the tag
3. Attaches all installer files to the release
4. Generates release notes from commits

### Artifacts

Built installers are also available as GitHub Actions artifacts (retained for 30 days) even for non-tag builds, useful for testing.

### Required Secrets

No additional secrets needed — the workflow uses the built-in `GITHUB_TOKEN` which is automatically provided by GitHub Actions.

## Licensing System

### How It Works

The app includes an offline licensing system. No internet or license server required.

#### User Experience

| Period | What the User Sees |
|--------|-------------------|
| First 3 months | App works perfectly with no indication of a trial |
| After 3 months | App is blocked. Activation screen shows the Machine ID and asks for a license key |
| After entering a valid key | App works for 1 year (or however long the key was generated for) |
| After license expires | App is blocked again. User needs a new key (renewal) |

#### App Startup Flow

```
App launches
    │
    ▼
Check license
    ├── Trial active (< 3 months) ──────────────┐
    ├── Licensed (valid key, not expired) ───────┤
    ├── Trial expired (> 3 months) → Activation  │
    └── License expired → Activation             │
                                                 ▼
                                          Setup (first time)
                                                 │
                                                 ▼
                                            Login screen
                                                 │
                                                 ▼
                                              Main app
```

#### Machine ID

Each installation generates a unique Machine ID based on hardware fingerprint (CPU, hostname, MAC address, etc.). Format: `LDG-XXXX-XXXX-XXXX`. The same machine always produces the same ID, even after reinstalling the app.

#### Generating License Keys (Developer Only)

When a user's trial expires, they send you their Machine ID. You run:

```bash
# Generate a 1-year license
npx ts-node tools/generate-license.ts LDG-4F8A-B2C1-9D3E

# Generate a 2-year license
npx ts-node tools/generate-license.ts LDG-4F8A-B2C1-9D3E 2
```

Output:
```
=== License Key Generated ===
Machine ID:  LDG-4F8A-B2C1-9D3E
Type:        Full
Expires:     2027-04-05 (1 year)
License Key: F2027-0405A-B3C8D-1E9F2-47A5B
```

You send the license key to the user. They enter it on the activation screen.

#### How Validation Works

1. The license key encodes: type + expiry date + HMAC signature
2. The signature is generated using the Machine ID + a secret key embedded in the app
3. On validation, the app recalculates the signature from the current Machine ID + the secret
4. If signatures match → key is valid. If not → rejected
5. Users cannot forge keys because they don't have the secret

#### Key Files

| File | Purpose | Shipped with app? |
|------|---------|-------------------|
| `src/licensing/machine-id.ts` | Generates hardware fingerprint | Yes |
| `src/licensing/license.ts` | Encodes/decodes/validates license keys | Yes |
| `tools/generate-license.ts` | CLI to generate keys (developer use only) | **No** |

> **Important:** The `tools/` directory should NOT be included in distributed builds. It contains the license generation logic. The `LICENSE_SECRET` in `src/licensing/license.ts` should be changed to your own random string before distributing.

## Project Structure

```
ledger/
├── .github/workflows/
│   └── build.yml              # CI/CD pipeline
├── build/
│   ├── icon.ico               # Windows icon
│   ├── icon.png               # Base icon (512x512)
│   ├── icon.svg               # Source icon
│   └── icons/                 # Linux icons (16-512px)
├── src/
│   ├── main/
│   │   ├── index.ts           # Electron main process, backup + licensing
│   │   ├── preload.ts         # Secure IPC bridge
│   │   └── ipc-handlers.ts    # IPC request handlers
│   ├── database/
│   │   └── database.ts        # SQLite database + double-entry engine
│   ├── licensing/
│   │   ├── machine-id.ts      # Hardware fingerprint generator
│   │   └── license.ts         # License key encode/decode/validate
│   ├── renderer/
│   │   ├── App.tsx            # Main app with license/setup/login flow
│   │   ├── index.tsx          # React entry point
│   │   ├── styles.css         # Dark theme
│   │   ├── components/
│   │   │   ├── CommandPalette.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── SearchSelect.tsx
│   │   │   ├── StatusBar.tsx
│   │   │   └── Toast.tsx
│   │   ├── views/
│   │   │   ├── ActivationScreen.tsx  # License activation (shown when expired)
│   │   │   ├── SetupWizard.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── UserManager.tsx
│   │   │   ├── ChartOfAccounts.tsx
│   │   │   ├── JournalEntry.tsx
│   │   │   ├── GeneralLedger.tsx
│   │   │   ├── TrialBalance.tsx
│   │   │   └── CurrencyManager.tsx
│   │   └── utils/
│   │       └── exportExcel.ts
│   └── shared/
│       └── types.ts           # Shared TypeScript types
├── tools/
│   └── generate-license.ts    # License key generator (developer only, NOT shipped)
├── electron-bootstrap.js      # Electron env workaround
├── webpack.config.js
├── tsconfig.json
└── package.json
```

## License

ISC
