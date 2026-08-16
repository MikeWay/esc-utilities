import * as fs from 'fs';
import { PID_FILE } from './globalSetup';

export default async function globalTeardown(): Promise<void> {
  try {
    const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
  } catch {}
}
