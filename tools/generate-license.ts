/**
 * License Key Generator — run on YOUR machine only, never shipped with the app.
 *
 * Usage:
 *   npx ts-node tools/generate-license.ts <MACHINE-ID> [years]
 *
 * Examples:
 *   npx ts-node tools/generate-license.ts LDG-4F8A-B2C1-9D3E
 *   npx ts-node tools/generate-license.ts LDG-4F8A-B2C1-9D3E 2
 */

import { generateLicenseKey } from '../src/licensing/license';

const machineId = process.argv[2];
const years = parseInt(process.argv[3] || '1');

if (!machineId) {
  console.error('Usage: npx ts-node tools/generate-license.ts <MACHINE-ID> [years]');
  console.error('Example: npx ts-node tools/generate-license.ts LDG-4F8A-B2C1-9D3E 1');
  process.exit(1);
}

const expiry = new Date();
expiry.setFullYear(expiry.getFullYear() + years);
const expiryDate = expiry.toISOString().split('T')[0];

const key = generateLicenseKey({
  machineId,
  expiryDate,
  type: 'full',
});

console.log('');
console.log('=== License Key Generated ===');
console.log(`Machine ID:  ${machineId}`);
console.log(`Type:        Full`);
console.log(`Expires:     ${expiryDate} (${years} year${years > 1 ? 's' : ''})`);
console.log(`License Key: ${key}`);
console.log('');
