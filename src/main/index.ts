import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { Database } from '../database/database';
import { registerIpcHandlers } from './ipc-handlers';
import { getMachineId } from '../licensing/machine-id';
import { validateLicenseKey } from '../licensing/license';

let mainWindow: BrowserWindow | null = null;
let db: Database;

function createWindow() {
  mainWindow = new BrowserWindow({
    minWidth: 900,
    minHeight: 600,
    title: 'Ledger - Double Entry Accounting',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.maximize();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

function performDailyBackup() {
  try {
    const backupDir = db.getBackupPath();
    if (!backupDir) return;

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const today = new Date().toISOString().split('T')[0];
    const backupFile = path.join(backupDir, `ledger-backup-${today}.db`);

    if (fs.existsSync(backupFile)) return;

    const dbPath = db.getDbPath();
    fs.copyFileSync(dbPath, backupFile);
    console.log(`Backup created: ${backupFile}`);
  } catch (err) {
    console.error('Backup failed:', err);
  }
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'ledger.db');
  db = new Database(dbPath);
  registerIpcHandlers(ipcMain, db);

  // Folder picker dialog
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Backup Folder',
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // Licensing
  ipcMain.handle('license:getMachineId', () => getMachineId());

  ipcMain.handle('license:getStatus', () => {
    const machineId = getMachineId();
    const storedKey = db.getSetting('license_key');
    const firstInstall = db.getSetting('first_install_date');

    // Set first install date if not set
    if (!firstInstall) {
      db.setSetting('first_install_date', new Date().toISOString().split('T')[0]);
    }

    const installDate = firstInstall || new Date().toISOString().split('T')[0];
    const trialExpiry = new Date(installDate);
    trialExpiry.setMonth(trialExpiry.getMonth() + 3);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const daysUntil = (dateStr: string) => {
      const diff = new Date(dateStr).getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    // If there's a license key, validate it
    if (storedKey) {
      const result = validateLicenseKey(storedKey, machineId);
      if (result.valid && !result.expired) {
        return { status: 'licensed', expiryDate: result.expiryDate, machineId, daysRemaining: daysUntil(result.expiryDate!) };
      }
      if (result.valid && result.expired) {
        return { status: 'license_expired', expiryDate: result.expiryDate, machineId, daysRemaining: 0 };
      }
    }

    // Trial check
    const trialExpiryDate = trialExpiry.toISOString().split('T')[0];
    const trialDays = daysUntil(trialExpiryDate);
    if (trialDays > 0) {
      return { status: 'trial_active', expiryDate: trialExpiryDate, machineId, daysRemaining: trialDays };
    }

    return { status: 'trial_expired', expiryDate: trialExpiryDate, machineId, daysRemaining: 0 };
  });

  ipcMain.handle('license:activate', (_, key: string) => {
    const machineId = getMachineId();
    const result = validateLicenseKey(key, machineId);

    if (!result.valid) {
      return { success: false, error: result.error || 'Invalid license key' };
    }
    if (result.expired) {
      return { success: false, error: `This license key expired on ${result.expiryDate}` };
    }

    // Store the valid key
    db.setSetting('license_key', key);
    return { success: true, expiryDate: result.expiryDate };
  });

  createWindow();

  // Run daily backup on startup
  performDailyBackup();

  // Also run backup every 6 hours while app is open
  setInterval(performDailyBackup, 6 * 60 * 60 * 1000);
});

app.on('window-all-closed', () => {
  db?.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
