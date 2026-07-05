// Emlékeztető-ütemező — önálló PM2-process. Naponta egyszer meghívja a helyi
// /api/reminders/run végpontot; minden logika a Next szerverben van, ez csak trigger.
// Env: NOTIFY_SECRET (kötelező), APP_URL (alap: http://localhost:3939), CRON_SPEC (alap: napi 8:00).
import cron from 'node-cron';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .env.local betöltése (a Next automatikusan olvassa, de ez a process nem Next alatt fut)
const dir = path.dirname(fileURLToPath(import.meta.url));
try {
  const envRaw = readFileSync(path.join(dir, '..', '.env.local'), 'utf8');
  envRaw.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
} catch { /* nincs .env.local — a küldő úgyis hibát ad */ }

const APP_URL = process.env.APP_URL || 'http://localhost:3939';
const SECRET = process.env.NOTIFY_SECRET || '';
const SPEC = process.env.CRON_SPEC || '0 8 * * *'; // minden nap 8:00

async function tick() {
  const stamp = new Date().toISOString();
  try {
    const r = await fetch(`${APP_URL}/api/reminders/run`, {
      method: 'POST',
      headers: { 'x-notify-secret': SECRET },
    });
    const j = await r.json().catch(() => ({}));
    console.log(`[reminder-cron ${stamp}] status=${r.status} due=${j.due ?? '?'} results=${JSON.stringify(j.results ?? [])}`);
  } catch (e) {
    console.error(`[reminder-cron ${stamp}] hiba:`, String(e));
  }
}

console.log(`[reminder-cron] elindult — ütemezés: "${SPEC}" (Europe/Budapest), cél: ${APP_URL}`);
cron.schedule(SPEC, tick, { timezone: 'Europe/Budapest' });
