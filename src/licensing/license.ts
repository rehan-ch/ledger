import crypto from 'crypto';

// This secret is embedded in the app. Change it to your own random string.
const LICENSE_SECRET = 'LDG_8f3k2m9x4b7w1p6v0n5j_SECRET_2024';

export interface LicenseData {
  machineId: string;
  expiryDate: string; // YYYY-MM-DD
  type: 'full';       // only full licenses (trial is silent/automatic)
}

// Encode license data + signature into a key
export function generateLicenseKey(data: LicenseData): string {
  const payload = `${data.type}|${data.expiryDate}|${data.machineId}`;
  const signature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 16)
    .toUpperCase();

  // Encode: type(1) + expiry(YYYYMMDD) + signature(16)
  // F20270405 + signature
  const typeChar = 'F'; // F = full
  const expiryCompact = data.expiryDate.replace(/-/g, '');
  const raw = `${typeChar}${expiryCompact}${signature}`;

  // Format as XXXX-XXXX-XXXX-XXXX-XXXX (25 chars = 5 groups of 4 + 5 remaining)
  return raw.match(/.{1,5}/g)!.join('-');
}

// Decode a license key and validate it against a machine ID
export function validateLicenseKey(key: string, machineId: string): {
  valid: boolean;
  expired: boolean;
  expiryDate: string | null;
  error?: string;
} {
  try {
    // Remove dashes
    const raw = key.replace(/-/g, '').toUpperCase();

    if (raw.length !== 25) {
      return { valid: false, expired: false, expiryDate: null, error: 'Invalid key format' };
    }

    const typeChar = raw[0];
    if (typeChar !== 'F') {
      return { valid: false, expired: false, expiryDate: null, error: 'Invalid key type' };
    }

    const expiryCompact = raw.substring(1, 9);
    const signatureFromKey = raw.substring(9);

    // Parse expiry date
    const year = expiryCompact.substring(0, 4);
    const month = expiryCompact.substring(4, 6);
    const day = expiryCompact.substring(6, 8);
    const expiryDate = `${year}-${month}-${day}`;

    // Validate date is real
    const expiryTs = new Date(expiryDate).getTime();
    if (isNaN(expiryTs)) {
      return { valid: false, expired: false, expiryDate: null, error: 'Invalid expiry date in key' };
    }

    // Recreate the signature
    const payload = `full|${expiryDate}|${machineId}`;
    const expectedSignature = crypto
      .createHmac('sha256', LICENSE_SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 16)
      .toUpperCase();

    if (signatureFromKey !== expectedSignature) {
      return { valid: false, expired: false, expiryDate, error: 'Invalid license key for this machine' };
    }

    // Check expiry
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const expired = expiryTs < now.getTime();

    return { valid: true, expired, expiryDate };
  } catch {
    return { valid: false, expired: false, expiryDate: null, error: 'Failed to validate key' };
  }
}
