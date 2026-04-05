import crypto from 'crypto';
import os from 'os';

export function getMachineId(): string {
  const parts = [
    os.hostname(),
    os.cpus()[0]?.model || '',
    os.cpus().length.toString(),
    os.platform(),
    os.arch(),
    // Primary MAC address
    Object.values(os.networkInterfaces())
      .flat()
      .find(i => i && !i.internal && i.mac !== '00:00:00:00:00:00')?.mac || '',
    os.totalmem().toString(),
  ];

  const hash = crypto.createHash('sha256').update(parts.join('|')).digest('hex');

  // Format as LDG-XXXX-XXXX-XXXX
  const short = hash.substring(0, 12).toUpperCase();
  return `LDG-${short.slice(0, 4)}-${short.slice(4, 8)}-${short.slice(8, 12)}`;
}
